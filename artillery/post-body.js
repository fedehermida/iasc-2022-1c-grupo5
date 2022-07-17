/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';
const fs = require('fs');
const path = require('path');

const genPayloads = (userContext, events, done) => {
  try {
    let bidContents = fs.readFileSync(
      path.resolve(__dirname, './post-data-bid.json'),
      'utf8',
    );
    const bidPayload = JSON.parse(bidContents);
    userContext.vars.bidPayload = bidPayload;

    let buyerContents = fs.readFileSync(
      path.resolve(__dirname, './post-data-buyer.json'),
      'utf8',
    );
    const buyerPayload = JSON.parse(buyerContents);
    userContext.vars.buyerPayload = buyerPayload;

    return done();
  } catch (err) {
    console.error(err);
    throw err;
  }
};

module.exports = { genPayloads };
