import { DoneCallback, Job } from 'bull';
import { find } from 'lodash';
import puppeteer from 'puppeteer-extra';
import { createLogger } from './utils/createLogger';
import { createOkamiInstance } from './utils/createOkamiInstance';

type CheckWithExistsNewChapterDto = {
  id: string;
  url: string;
  cap: number;

  name: string;
};

export class ProcessFetchForNewChapter {
  private readonly _logger = createLogger(ProcessFetchForNewChapter.name);

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

    return puppeteer.launch({
      headless: 'new',
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

  async execute(job: Job<CheckWithExistsNewChapterDto>, done: DoneCallback) {
    try {
      const { cap, id, name, url } = job.data;

      this._logger.info(`Starting job ${id}`);

      const browser = await this.initializeBrowser();

      const page = await browser.newPage();

      await page.setViewport({ width: 800, height: 600 });

      this._logger.info(`Opening page ${url}`);

      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 5.1; rv:5.0) Gecko/20100101 Firefox/5.0',
      );

      await page.goto(url, {
        waitUntil: 'networkidle2',
      });

      const html = await page.evaluate(
        () => document.querySelector('*').outerHTML,
      );

      this._logger.info(`extract html from page ${url}`);

      await browser.close();

      this._logger.info(`Close browser for ${url}`);

      const possibleNextChapters = this.predictingNextChapterList(cap);

      this._logger.info(`verify for new chapters ${name} ${cap}`);

      const stringsToMatch = possibleNextChapters
        .map((cap) => this.stringMatchFilterList(cap))
        .flat();

      const newChapter = find(stringsToMatch, (stringToMatch) =>
        html.includes(stringToMatch),
      );

      if (!!newChapter) {
        this._logger.info(`Found new chapter for ${name}, chapter -> ${cap} `);

        this._logger.info(`Marking work ${name} as unread`);

        const okamiService = await createOkamiInstance();

        await okamiService.markWorkUnread(id);

        this._logger.info(`work marked with ${name} as unread`);
      } else {
        this._logger.warn(`not found new chapter for ${name}`);
      }

      done();
    } catch (e) {
      done(e);
    }
  }
}

export default function handle(
  job: Job<CheckWithExistsNewChapterDto>,
  dn: DoneCallback,
) {
  const worker = new ProcessFetchForNewChapter();

  return worker.execute(job, dn);
}
