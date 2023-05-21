import { OnQueueCompleted, Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import * as cheerio from 'cheerio';
import { find } from 'lodash';
import puppeteer from 'puppeteer-extra';
import { OkamiService } from 'src/okami.service';

export const fetchWorkEpisodeToken = 'find-serie-episode';

export interface FindSerieEpisodeJobData {
  id: string;
  url: string;
  episode: number;
  name: string;
}

interface FindSerieEpisodeJobResponse {
  id: string;
  hasNewEpisode: boolean;
  newEpisode: string | null;
  url: string;
  name: string;
}

@Processor(fetchWorkEpisodeToken)
export class FetchForNewEpisodeJob {
  private logger = new Logger(FetchForNewEpisodeJob.name);

  constructor(private readonly okamiService: OkamiService) {}

  private async initializeBrowser() {
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
      executablePath: '/usr/bin/google-chrome',
      args,
      channel: 'chrome-beta',
    });
  }

  stringMatchFilterList = (episode: number) => [
    `Episódio ${episode.toString()}`,
    `Ep ${episode.toString()}`,
    `Eps ${episode.toString()}`,
    `episódio ${episode.toString()}`,
    `ep. ${episode.toString()}`,
    `Ep ${episode.toString()}`,
    `Ep. ${episode.toString()}`,
  ];

  private predictingNextEpisodeList(currentEpisode: number) {
    let value = currentEpisode;

    return Array.from({ length: 10 }, () => Number((value += 0.1).toFixed(1)));
  }

  @Process()
  public async execute({
    data: { episode, id, url, name },
  }: Job<FindSerieEpisodeJobData>): Promise<FindSerieEpisodeJobResponse> {
    const browser = await this.initializeBrowser();

    try {
      this.logger.debug(`Initit job for ${name} - ${id}`);

      const page = await browser.newPage();

      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 5.1; rv:5.0) Gecko/20100101 Firefox/5.0',
      );

      this.logger.debug(`Opening page ${url}`);

      await page.goto(url, { waitUntil: 'networkidle2' });

      const html = await page.evaluate(() => document.body.innerHTML);

      const content = cheerio.load(html);

      const possibleNextEpisodes = this.predictingNextEpisodeList(episode);

      const stringsToMatch = possibleNextEpisodes
        .map((episode) => this.stringMatchFilterList(episode))
        .flat();

      const newEpisode = find(stringsToMatch, (string) =>
        content('*').first().text().includes(string),
      );

      return {
        hasNewEpisode: !!newEpisode,
        name,
        newEpisode,
        url,
        id,
      };
    } catch (error) {
      this.logger.error(error);
    } finally {
      await browser.close();
    }
  }

  @OnQueueCompleted()
  async onJobCompleted({ returnvalue }: Job) {
    const { hasNewEpisode, name, newEpisode, id } =
      returnvalue as FindSerieEpisodeJobResponse;

    if (hasNewEpisode) {
      this.logger.log(`Found new episode for ${name} - ${id}`);
      this.logger.log(`New episode: ${newEpisode}`);

      await this.okamiService.markWorkUnread(id);

      return;
    }

    this.logger.debug(`No new episode for ${name} - ${id}`);
  }
}
