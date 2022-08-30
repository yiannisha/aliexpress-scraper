'use strict';

/*
 * Utilities for the scraper.js module
 */

module.exports = {
  extractShippingData: extractShippingData,
  extractSkuIdFromPostData: extractSkuIdFromPostData,
  formatData: formatData,
  isOptionRequest: isOptionRequest,
};

/*
 * Returns the skuId from a 'queryoptionforitem'
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

  15 is a constant needed to get postData.slice right
  "around" the skuId string.
  */

  return postData.slice(
          postData.search(/p0/) + 17,
          Math.min(
            postData.search(/p1/),
            postData.search(/p10/) || 1000
          ) - 15
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

/*
 * Returns a javascript object with all the data from a single page
 * formatted in a useful way.
 *
 * @param {Object} pageData: an object with all the data that is already
 * available on the page.
 * @param {Object} responseData: an object with all the data gathered
 * from responses.
 *
 */
function formatData (pageData, responseData) {

  var propertyDict = (( objList ) => {

      var outputDict = {};

      for (let obj of objList) {
        let propName = obj.skuPropertyName;

        for (let propValue of obj.skuPropertyValues) {
          outputDict[propValue.propertyValueId.toString()] = {
            name: propName,
            value: propValue.propertyValueDisplayName,
            imgURL: propValue.skuPropertyImagePath || null
          };
        }
      }

      return outputDict;

  })(pageData.skuModule.productSKUPropertyList);


  let formattedData = {
    name: pageData.titleModule.subject,
    variations: getVariations(pageData.skuModule, responseData, propertyDict)
  };

  return formattedData;
}

/*
 * Returns true if the url belongs to 'queryoptionforitem' request.
 *
 * @param {string} requestUrl
 */
 function isOptionRequest (url) {
   return /queryoptionforitem/.test(url);
 }

 /*
  * A bunch of helper functions
  *
  */

 function getVariations (skuModule, responseData, propertyDict) {

   let variations = [];

   for (let item of skuModule.skuPriceList) {
     if (item.skuVal.availQuantity == 0) {
       continue;
     }

     let skuId = item.skuIdStr;
     // console.log(skuId);
     // console.log(responseData[skuId]);

     variations.push(
       {
         price: item.skuVal.skuActivityAmount
         ? item.skuVal.skuActivityAmount.value : item.skuVal.skuAmount,
         shippingOptions: responseData[skuId],
         specifications: getSpecifications(item, propertyDict)
       }
     );
   }

   return variations;
 }

 function getSpecifications (item, propertyDict) {

   let specifications = {};

   // let propertyIdList = [1, 2, 3];
   var propertyIdList = getPropertyIds(item.skuAttr);

   for (let propId of propertyIdList) {
     let prop = propertyDict[propId];

     if (prop.imgURL) {
       specifications[ prop.name + "imgURL" ] = prop.imgURL;
     }

     specifications[ prop.name ] = prop.value;
   }

   return specifications;
 }

 function getPropertyIds (attrString) {
   let reg = /:(\d*)/g;

   let propertyIds = [];
   for (let id of attrString.match(reg)) {
     propertyIds.push(id.slice(1));
   };

   return propertyIds;
 }
