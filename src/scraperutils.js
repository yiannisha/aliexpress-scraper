'use strict';

module.exports = {
  extractShippingData: extractShippingData,
  extractSkuIdFromUrl: extractSkuIdFromUrl,
  // formatData: formatData
};

/*
 * Returns the skuId *as a number* from a 'queryoptionforitem'
 * request POST data.
 *
 * @param {str} postData: the request's POST data, URL-encoded
 *
 */
function extractSkuIdFromPostData (postData) {

  /*
  skuId is the value of the p0 param, after p0 it's either
  p1 or p10 with p10 sometimes not existing, so if it does
  it's replaced with the number 1000 inside Math.min.

  15 is a constant needed to get requestUrl.slice right
  "around" the skuId string.
  */

  return parseInt(
    requestUrl.slice(
      requestUrl.search(/p0/) + 15,
      Math.min(
        requestUrl.search(/p1/),
        requestUrl.search(/p10/) || 1000
      ) - 15
    )
  );

}

/*
 * Returns an array of javascript objects of all the shipping options
 * in responseBody.
 *
 * @param {Array[Object]} responseBody: an array of javascript objects
 * representing the shipping options as returned by the 'queryoptionforitem'
 * request in AliExpress.
 *
 */
function extractShippingData (responseBody) {

  var shippingOptions = [];

  for (let option of responseBody) {
    option = option.bizData;

    shippingOptions.push({
      price:
        (option.shippingFee == 'free') ? 0:parseFloat(option.displayAmount),
      tracking:
        option.tracking == 'visible',
      deliveryProviderName:
        option.deliveryProviderName,
      deliveryDayMin:
        option.deliveryDayMin,
      deliveryDayMax:
        option.deliveryDayMax
    });
  }

  return shippingOptions;
}
