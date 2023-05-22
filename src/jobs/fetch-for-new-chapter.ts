import {
  OnQueueActive,
  OnQueueCompleted,
  OnQueueError,
  Process,
  Processor,
} from '@nestjs/bull';

import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { find } from 'lodash';
import puppeteer from 'puppeteer-extra';
import { OkamiService } from 'src/okami.service';

export type CheckWithExistsNewChapterDto = {
  id: string;
  url: string;
  cap: number;

  name: string;
};

type JobResponse = {
  name: string;
  url: string;
  cap: number;
  hasNewChapter: boolean;
  newChapter: string | null;
  stringsToMatch: string[];
  html: string;
  id: string;
};

export const FetchForNewChapterToken = 'find-comic-cap-by-url';

@Processor(FetchForNewChapterToken)
export class FetchForNewChapterJob {
  private readonly _logger = new Logger(FetchForNewChapterJob.name);

  constructor(private readonly okamiService: OkamiService) {}

  async initializeBrowser() {
    const args: string[] = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-infobars',
      '--window-position=0,0',
      '--ignore-certifcate-errors',
      '--ignore-certifcate-errors-spki-list',
      '--user-agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3312.0 Safari/537.36"',
    ];

    //    puppeteer.use(StealthPlugin());

    return puppeteer.launch({
      executablePath: '/usr/bin/google-chrome',
      args,
      channel: 'chrome-beta',
    });
  }

  stringMatchFilterList = (chapter: number) => [
    `Capítulo ${chapter.toString()}`,
    `Cap ${chapter.toString()}`,
    `cap ${chapter.toString()}`,
    `capítulo ${chapter.toString()}`,
    `cap. ${chapter.toString()}`,
    `Cap. ${chapter.toString()}`,
    `Cap. ${chapter.toString()}`,
  ];

  predictingNextChapterList(currentCap: number) {
    let value = currentCap;

    return Array.from({ length: 10 }, () => Number((value += 0.1).toFixed(1)));
  }
  @Process()
  async execute({
    data: { cap, url, name, id },
  }: Job<CheckWithExistsNewChapterDto>): Promise<JobResponse> {
    const browser = await this.initializeBrowser();

    try {
      const page = await browser.newPage();

      this._logger.log(`Opening page ${url}`);

      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 5.1; rv:5.0) Gecko/20100101 Firefox/5.0',
      );

      await page.goto(url, {
        waitUntil: 'networkidle2',
      });

      const html = await page.evaluate(
        () => document.querySelector('*').outerHTML,
      );

      const possibleNextChapters = this.predictingNextChapterList(cap);

      const stringsToMatch = possibleNextChapters
        .map((cap) => this.stringMatchFilterList(cap))
        .flat();

      const newChapter = find(stringsToMatch, (stringToMatch) =>
        html.includes(stringToMatch),
      );

      await browser.close();

      return {
        id,
        hasNewChapter: !!newChapter,
        newChapter: newChapter || null,
        stringsToMatch,
        html,
        cap,
        url,
        name,
      };
    } catch (e) {
      this._logger.error(e);
      throw e;
    } finally {
      await browser.close();
    }
  }

  @OnQueueActive()
  async onJobInit(job: Job) {
    this._logger.log(`JobInit ${job.data.name} - ${job.data.url}`);
  }

  @OnQueueError()
  async error(any, error) {
    this._logger.error(JSON.stringify({ any, error }));
  }

  @OnQueueCompleted()
  async onJobCompleted({ returnvalue }: Job<JobResponse>) {
    const { id, hasNewChapter, newChapter, name } = returnvalue as JobResponse;

    if (hasNewChapter) {
      this._logger.log(`Found new chapter for ${name} - ${id}`);
      this._logger.log(`New chapter: ${newChapter}`);

      await this.okamiService.markWorkUnread(id);
    } else {
      this._logger.debug(`No new chapter for ${name} - ${id}`);
    }
  }
}
