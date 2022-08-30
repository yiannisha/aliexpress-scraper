'use strict';

/*
 * Scrape product data from aliexpress using puppeteer.
 */

const utils = require('./scraperutils');
const cookies = require('./cookies');

const _ = require('lodash');
const puppeteer = require('puppeteer');

/*
 * A class to handle all interaction with the browser.
 */
class Scraper {

  static requests = 0;
  static responses = 0;
  static shippingData = {};

  /*
   * @param {boolean} headless: true to launch browser in headless mode
   * @param {boolean} debug: true to time setup and each scrape, outputs
   * each time to stdout.
   * @param {boolean} devtools: true to launch browser with devtools open,
   * defaults headless to true
   * @param {string} browserWSEndpoint: link to an external browser to connect to,
   * if none provided then it will launch its own chromium browser
   * @param {Object} browserArgs: javascript object with additional arguments
   * for the puppeteer browser
   *
   */
  constructor ( browser, page, headless = true, debug = false,
                devtools = false, browserWSEndpoint = null, browserArgs = {} ) {
    this.headless = headless || devtools;
    this.debug = debug;
    this.devtools = devtools;
    this.browserWSEndpoint = browserWSEndpoint;
    this.browserArgs = browserArgs;

    this.browser = browser;
    this.page = page;

    // if (this.debug) {
    //
    //   // cannot do [this.browser, this.page] = this.async...
    //   // because the 'this' in front of the function takes a value other than self
    //   const out = this.asyncLogTime(`setup`, this.setUpBrowserAndPage, [this]);
    //
    //   this.browser = out[0];
    //   this.page = out[1];
    // }
    // else {
    //   const out = this.setUpBrowserAndPage(this);
    //   this.browser = out[0];
    //   this.page = out[1];
    // }

    // this.requests = 0
    // this.shippingData = {};
  }

  static async build ( headless = true, debug = false,
                devtools = false, browserWSEndpoint = null, browserArgs = {} ) {

    let args = [headless, debug, devtools, browserWSEndpoint, browserArgs];

    var out;
    if (debug) {
      out = await Scraper.asyncLogTime('setup', Scraper.setUpBrowserAndPage, args);
    }
    else {
      out = await Scraper.setUpBrowserAndPage(...args);
    }
    return new Scraper(...out, ...args);
  }

  /*
   * Runs passed functions, timing their total execution time and
   * printing it to stdout.
   * Returns whatever the functions would have returned.
   *
   * @param {string} label: label to use when printing time to stdout
   * @param {Array[functoin]} funcs: array of functions to run and time
   * @param {Array[Array]} args: array of arrays of arguments to pass
   * to each function
   */
  static logTime (label, func, args = []) {

    console.time(label);
    let output = func.call(...args);
    console.timeEnd(label);

    return output;
  }

  /*
   * Same as logTime but takes async functions.
   * Returns whatever the functions would have returned.
   *
   * @param {string} label : label to use when printing time to stdout
   * @param {function} func : array of functions to run and time
   * @param {Array[Array]} args : array of arrays of arguments to pass
   * to each function
   *
   */
  static async asyncLogTime (label, func, args = []) {

    console.time(label);
    let output = await func.call(this, ...args);
    console.timeEnd(label);

    return output;
  }

  /*
   * Returns a javascript object ready to be passed as an options
   * parameter to puppeteer.launch/.connect
   */
  static parseBrowserOptions (headless = true, debug = false,
                devtools = false, browserWSEndpoint = null, browserArgs = {}) {

    let options = {
      headless: headless,
      devtools: devtools,
      browserWSEndpoint: browserWSEndpoint
    };
    for (let key of Object.keys(browserArgs)) {
      options[key] = browserArgs[key];
    }

    return options;
  }

  /*
   * Calls launchBrowserAndPage or connectBrowserAndPage.
   * This wrap is needed because of complications that are caused
   * by async when there's a single function to handle both.
   */
  static async setUpBrowserAndPage (headless = true, debug = false,
                devtools = false, browserWSEndpoint = null, browserArgs = {}) {

    let args = [headless, debug, devtools, browserWSEndpoint, browserArgs];

    if (browserWSEndpoint) {
      return await Scraper.connectBrowserAndPage(...args);
    }
    return await Scraper.launchBrowserAndPage(...args);
  }

  /*
   * Returns a puppeteer browser and a puppeteer page to be used
   * later on for scraping items from aliexpress.
   *
   * Use only when launching a local browser.
   */
  static async launchBrowserAndPage (headless = true, debug = false,
                devtools = false, browserWSEndpoint = null, browserArgs = {}) {

    let args = [headless, debug, devtools, browserWSEndpoint, browserArgs];

    let options = Scraper.parseBrowserOptions(...args);

    // launch own chromium browser
    const browser = await puppeteer.launch(options);

    // go to aliexpress.com and inject cookies
    const page = await browser.newPage();
    await page.goto('https://www.aliexpress.com/');
    await Scraper.injectCookie(page, cookies.locationCookie);
    await Scraper.injectCookie(page, cookies.newUserBonusCookie);

    // enable and add request interceptor on 'request' event
    await page.setRequestInterception(true);
    page.on('request', Scraper.requestInterceptor);

    // add response handler on 'response' event
    page.on('response', Scraper.responseHandler);

    return [browser, page];
  }

  /*
   * Returns a puppeteer browser and a puppeteer page to be used
   * later on for scraping items from aliexpress.
   *
   * Use only when connecting to an external browser.
   */
  static async connectBrowserAndPage (headless = true, debug = false,
                devtools = false, browserWSEndpoint = null, browserArgs = {}) {

    let args = [headless, debug, devtools, browserWSEndpoint, browserArgs];

    let options = Scraper.parseBrowserOptions(...args);

    // launch own chromium browser
    const browser = await puppeteer.connect(options);

    // go to aliexpress.com and inject cookies
    const page = await browser.newPage();
    await page.goto('https://www.aliexpress.com/');
    await Scraper.injectCookie(page, cookies.locationCookie);
    await Scraper.injectCookie(page, cookies.newUserBonusCookie);

    // enable and add request interceptor on 'request' event
    await page.setRequestInterception(true);
    page.on('request', Scraper.requestInterceptor);

    // add response handler on 'response' event
    page.on('response', Scraper.responseHandler);

    return [browser, page];
  }

  /*
   * Intercepts requests and keeps a count of how many 'queryoptionforitem'
   * POST requests were made.
   *
   */
   static async requestInterceptor (request) {
     let requestUrl = await request.url();
     if (utils.isOptionRequest(requestUrl)) {
       Scraper.requests++;
       // console.log(`Counted ${Scraper.requests} requests`);
     }
     request.continue();
   }

  /*
   * Extracts data from 'queryoptionforitem' responses.
   *
   */
   static async responseHandler (response) {
     try {
       let request = await response.request();
       let requestUrl = await request.url();

       if (utils.isOptionRequest(requestUrl)) {
         let postData = await request.postData();
         let responseJSON = await response.json();

         let skuId = utils.extractSkuIdFromPostData(postData);
         let data = utils.extractShippingData(responseJSON.data.originalLayoutResultList);

         Scraper.shippingData[skuId] = data;

         Scraper.responses++;
         // console.log(`Handled ${Scraper.responses} responses`);
       }
     }
     catch (err) {
       if (err) console.log(err);
     }
   }

  /*
   * Returns a javascript object with the data scraped from the URL.
   *
   * @param {string} itemUrl: aliexpress url to an item
   *
   */
   async scrapeUrl (itemUrl) {

     await this.page.goto(itemUrl);

     // get the data that is already in the page's html
     // click all possible variations to initiate all requests
     let data = await this.page.evaluate(() => {
       let lists = document.getElementsByClassName('sku-property-list');
       var variations = 1;

       // number of all possible variations
       for (list of lists) {
         variations *= list.children.length;
       }

       // click all possible variations
       lists[0].children[0].click();
       if (lists.length > 1) {
         clickAllItems(lists[1], 1);
       }

       // recursive function to click all possible variations
       // console.log here prints inside the page's console
       function clickAllItems (list, index=0) {
           let final = index == (lists.length - 1);
           let children = (index) ? Array.from(list.children):Array.from(list.children).slice(1);
           if (!final) {
             for (child of children) {
                 child.click();
                 // console.log(index);
                 clickAllItems(lists[index+1], index+1);
             }
           }
           else {
             for (child of children) {
               // console.log(index);
               child.click();
             }
           }
       }

       clickAllItems(lists[0]);

       // return already available data stored inside the runParams object
       // and the number of possible variations
       return [runParams, variations];

     });

     let waitResponse = true;
     let retry = false;
     while (Object.keys(Scraper.shippingData).length < Math.max(Scraper.requests, data[1]) && waitResponse) {
       await this.page.waitForResponse(response => true, {timeout: 1000})
       .catch(error => {
         // console.log(error);
         waitResponse = false;
       });
     }

     // console.log(Object.keys(Scraper.shippingData));
     // at this point we have all needed data and we can format it
     let out = utils.formatData(data[0].data, Scraper.shippingData);
     // let out = Scraper.shippingData;
     // let out = null;

     Scraper.shippingData = {};
     Scraper.requests = 0;
     Scraper.responses = 0;

     return out;

   }

  /*
   * Injects cookie into page, replacing any other cookie with the same name.
   *
   * @param {puppeteer.Page} page: puppeteer page to inject the cookie into
   * @param {Object} cookie: object with the name, value and domain of the cookie
   *
   */
   static async injectCookie (page, cookie) {
     await page.deleteCookie({
       name: cookie.name,
       domain: cookie.domain
     });

     await page.setCookie(cookie);
   }

   /*
    * Closes the browser if there's one.
    */
   async close () {
     if (this.browser) {
       return await this.browser.close();
     }
     else {
       console.error('Cannot close browser because no browser was created!');
     }
   }

}

// export class as 'Scraper'
module.exports = {
  Scraper: Scraper
};
