const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const crypto = require('crypto');
const dotenv = require('dotenv').config();
const mongoose = require('mongoose');
const Url = require('./model/Urls');

const app = express();
app.use(bodyParser.json());
app.use(cors());
const uri = process.env.URI;
const port = 3000;

function validateUrl(url) {
  const urlRegex = new RegExp(
    /^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/
  );
  const isValid = urlRegex.test(url);
  return isValid;
}

function urlToUniqueBase64(url) {
  const hash = crypto.createHash('sha256').update(url).digest('base64');
  const base64String = hash.substr(0, 10);
  return base64String;
}

function validateShortUrl(shortUrl) {
  const shortUrlRegex = new RegExp(/^[a-zA-Z0-9-_]{10}$/);
  const isValid = shortUrlRegex.test(shortUrl);
  return isValid;
}

app.get('/:shortUrl', async (req, res) => {
  const shortUrl = req.params.shortUrl;
  if (!validateShortUrl(shortUrl)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid Short-URL',
    });
  }

  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    const url = await Url.findOne({ shortUrl });

    if (!url) {
      return res.status(404).json({
        success: false,
        error: 'No URL found',
      });
    }

    return res.status(200).json({
      success: true,
      data: url.url,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      error: 'Error while decoding Short-URL',
    });
  } finally {
    mongoose.disconnect();
  }
});

app.post('/api/shorten', async (req, res) => {
  const url = req.body.url;
  if (!validateUrl(url)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid URL',
    });
  }

  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const shortUrl = urlToUniqueBase64(url);

    const existingUrl = await Url.findOne({ shortUrl });
    if (existingUrl) {
      return res.status(200).json({
        success: true,
        data: existingUrl.shortUrl,
      });
    }

    const newUrl = new Url({
      url: url,
      shortUrl: shortUrl,
    });
    await newUrl.save();

    return res.status(200).json({
      success: true,
      data: shortUrl,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      error: 'Error while creating Short-URL',
    });
  } finally {
    mongoose.disconnect();
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
