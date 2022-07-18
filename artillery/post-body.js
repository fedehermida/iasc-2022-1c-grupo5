/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';
const fs = require('fs');
const path = require('path');

const parseJSONAndGetRandomPayload = (file) => {
  const contents = fs.readFileSync(path.resolve(__dirname, file), 'utf8');
  const payload = JSON.parse(contents);
  const randomIndex = Math.floor(Math.random() * payload.length);
  return payload[randomIndex];
};

const genPayloads = (userContext, events, done) => {
  try {
    userContext.vars.bidPayload = parseJSONAndGetRandomPayload('./post-data-bid.json');
    userContext.vars.buyerPayload1 = parseJSONAndGetRandomPayload('./post-data-buyer.json');
    userContext.vars.buyerPayload2 = parseJSONAndGetRandomPayload('./post-data-buyer.json');

    return done();
  } catch (err) {
    console.error(err);
    throw err;
  }
};

module.exports = { genPayloads };
