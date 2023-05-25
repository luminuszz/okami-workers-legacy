import { DoneCallback, Job } from 'bull';
import * as cheerio from 'cheerio';
import { find } from 'lodash';
import puppeteer from 'puppeteer-extra';
import { createLogger } from './utils/createLogger';
import { createOkamiInstance } from './utils/createOkamiInstance';

export const fetchWorkEpisodeToken = 'find-serie-episode';

export interface FindSerieEpisodeJobData {
  id: string;
  url: string;
  episode: number;
  name: string;
}

export class FetchForNewEpisodeJob {
  private logger = createLogger(FetchForNewEpisodeJob.name);

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
      headless: 'new',
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

  public async execute(job: Job<FindSerieEpisodeJobData>, done: DoneCallback) {
    const { episode, id, url, name } = job.data;

    const browser = await this.initializeBrowser();

    try {
      this.logger.info(`Initit job for anime ${name} - ${id}`);

      const page = await browser.newPage();

      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 5.1; rv:5.0) Gecko/20100101 Firefox/5.0',
      );

      this.logger.info(`Opening page ${url}`);

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

      if (!!newEpisode) {
        const okamiService = await createOkamiInstance();

        this.logger.info(`Found new episode for ${name} - ${id}`);
        this.logger.info(`New episode: ${newEpisode}`);

        await okamiService.markWorkUnread(id);
      } else {
        this.logger.warn(`No new episode for ${name} - ${id}`);
      }

      done(null, { message: 'Done' });
    } catch (error) {
      done(error, { message: error.message });
    }
  }
}

export default (job: Job<FindSerieEpisodeJobData>, dn: DoneCallback) => {
  const worker = new FetchForNewEpisodeJob();

  return worker.execute(job, dn);
};
