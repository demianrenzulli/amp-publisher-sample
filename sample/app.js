/**
 * Copyright 2015 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var express = require('express');
var app = express();
var path = require('path');
var http = require('http');
var urlModule = require('url');
var consts = require('../common/consts');

var PORT = 8002;

var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

var cons = require('consolidate');
app.engine('html', cons.mustache);

// set .html as the default extension
app.set('view engine', 'html');
app.set('views', __dirname + '/views');

var ROOT = __dirname;
var ARCHIVE_ROOT = path.join(ROOT, 'archive');

var MAX_VIEWS = 3;

var CLIENT_ACCESS = {};

app.get('/c/test.html', function(req, res) {
  res.render('index', {
  });
});

// Logging middleware
app.use(function(request, response, next) {
  console.log("In comes a " + request.method + " to " + request.url);
  next();
});

/** AUTHORIZATION CORS */
app.get('/amp-authorization.json', function(req, res) {
  console.log('Client access verification');
  var readerId = req.query.rid;
  if (!readerId) {
    res.sendStatus(400);
    return;
  }

  // In practice, Origin should be restricted to a few well-known domains.
  var requestingOrigin = req.header('Origin');
  console.log('---- requesting origin: ', requestingOrigin);
  if (requestingOrigin) {
    res.setHeader('Access-Control-Allow-Origin', requestingOrigin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  var clientAuth = CLIENT_ACCESS[readerId];
  if (!clientAuth) {
    clientAuth = {};
    CLIENT_ACCESS[readerId] = clientAuth;
  }

  var response;
  console.log('client auth', clientAuth.subscriber);
  if (clientAuth.subscriber) {
    // Subscriber.
    response = {
      'subscriber': true,
      'access': true
    };
  } else {
    // Metered.
    var views = (clientAuth.views || 0);
    response = {
      'views': views,
      'maxViews': MAX_VIEWS,
      'access': (views <= MAX_VIEWS)
    };
  }
  console.log('Authorization response:', readerId, response);
  res.json(response);
});

/** PINGBACK CORS */
app.post('/amp-pingback', function(req, res) {
  console.log('Client access pingback');
  var readerId = req.query.rid;
  if (!readerId) {
    res.sendStatus(400);
    return;
  }

  // In practice, Origin should be restricted to a few well-known domains.
  var requestingOrigin = req.header('Origin');
  console.log('---- requesting origin: ', requestingOrigin);
  if (requestingOrigin) {
    res.setHeader('Access-Control-Allow-Origin', requestingOrigin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  var clientAuth = CLIENT_ACCESS[readerId];
  if (!clientAuth) {
    clientAuth = {};
    CLIENT_ACCESS[readerId] = clientAuth;
  }

  if (!clientAuth.subscriber) {
    // Metered.
    var views = (clientAuth.views || 0) + 1;
    clientAuth.views = views;
  }
  console.log('Pingback response:', readerId, {}, clientAuth);
  res.json({});
});

var server = app.listen(PORT, function() {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Publisher listening on: ', port);
  console.log('ROOT: ' + ROOT);
  console.log('ARCHIVE_ROOT: ' + ARCHIVE_ROOT);
});
