
/**
 * Copyright 2013, 2017 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Modifications copyright (C) 2017 Sense Tecnic Systems, Inc.
 *
 **/

var request = require('request');
var Promise = require('bluebird');


module.exports = function (RED) {
  'use strict';


	
  function webAPIClientNode(config) {
    RED.nodes.createNode(this, config);
    var node = this;

    node.baseUrl = config.serverURL;
    node.authenticateMethod = config.authenticateMethod;
    this.usetls = config.usetls;

    if (typeof this.usetls === 'undefined') {
        this.usetls = false;
    };

    if (this.usetls && config.tls) {
      var tlsNode = RED.nodes.getNode(config.tls);
      if (tlsNode) {
        this.hostOptions = {};
        tlsNode.addTLSOptions(this.hostOptions);
      };
    }

    this.httpProtocal = (this.usetls)? 'https://' : 'http://';

    if (node.authenticateMethod === 'basic') {
      node.username = node.credentials.username;
      node.password = node.credentials.password;
    };

    this.generateAuth = function () {
      if (this.authenticateMethod === 'basic') {
        var buffer = new Buffer(this.username+":"+this.password);
        return "Basic " + buffer.toString('base64');
      } else if (this.authenticateMethod === 'anonymous') {
        return "";
      };
    };
  };

  RED.nodes.registerType("web-api-client", webAPIClientNode, {
    credentials:{
      username: {type:"text"},
      password: {type:"password"}
    }
  });

  webAPIClientNode.prototype.generateAuth = function () {
    if (this.authenticateMethod === 'basic') {
      var buffer = new Buffer(this.username+":"+this.password);
      return "Basic " + buffer.toString('base64');
    } else if (this.authenticateMethod === 'anonymous') {
      return "";
    };
  };

  webAPIClientNode.prototype.writeByWebId = function (protocol, webId, method, data, node) {
    var url= '/streams/' + webId + "/value";
    return node.server.writeByCustomUrl(protocol, url, method, data, node);
  };

  webAPIClientNode.prototype.writeByCustomUrl = function (protocol, url, method, data, node) {
    return new Promise(function(resolve, reject) {
      var requestOptions = {
        url: protocol + node.server.baseUrl + url,
        headers: {
          'Authorization': node.server.generateAuth(),
          'Content-Type': 'application/json',
	  'X-Requested-With' : 'XMLHttpRequest' //Proposed add-in to Allow Write data connection via pi web api to PI when "EnableCSRFDefense": true
        },
        json:true,
        "Cache-Control": "no-cache",
        method: method,
        rejectUnauthorized: false, //Ignore self-signed certificate on Web API server
        body: data
      };
      request(requestOptions, function(error, response, body){
        if(error) {
          return reject(error);
        };
        if( !response.hasOwnProperty('statusCode') || response.statusCode !== 202 ) {
          return reject({statusCode:response.statusCode, payload:response.body});
        };
        try{
          var result = (typeof response.body === 'string')? JSON.parse(response.body) : response.body;
          return resolve(result);
        }
        catch(e) {
          return reject(e);
        };
      });
    });
  };

  webAPIClientNode.prototype.queryByWebId = function (protocol, webId, node, dataType) {
    var queryByWebIdUrl = "";
    if (dataType === 'attributes') {
      queryByWebIdUrl = "/points/" + webId + '/' + dataType;
    } else if (dataType === 'self') {
      queryByWebIdUrl = "/points/" + webId;
    } else {
      queryByWebIdUrl = '/streams/' + webId + '/' + dataType;
    }
    return node.server.queryByCustomUrl(protocol, node, {relativeUrl:queryByWebIdUrl});
  };

  webAPIClientNode.prototype.queryByPath = function (protocol, urlparam, node) {
    return new Promise(function(resolve, reject) {
      var queryByPathUrl = '/points?path=' + urlparam;
      resolve(node.server.queryByCustomUrl(protocol, node, {relativeUrl:queryByPathUrl}));
    });
  };

  webAPIClientNode.prototype.queryByCustomUrl = function (protocol, node, customUrl) {
    return new Promise(function(resolve, reject) {
      var requestOptions = {
        url: (customUrl.hasOwnProperty('relativeUrl'))? (protocol + node.server.baseUrl + customUrl.relativeUrl) : customUrl.fullUrl,
        headers: {
          'Authorization': node.server.generateAuth(),
          'Content-Type': 'application/json'
        },
        json:true,
        "Cache-Control": "no-cache",
        method: "GET",
        rejectUnauthorized: false //Ignore self-signed certificate on Web API server
      };

      request(requestOptions, function(error, response) {
        if(error) {
          return reject(error);
        };
        if( !response.hasOwnProperty('statusCode') || response.statusCode !== 200 ) {
          return reject({statusCode:response.statusCode, payload:response.body});
        };
        try{
          var result = (typeof response.body === 'string')? JSON.parse(response.body) : response.body;
          return resolve(result);
        }
        catch(e) {
          return reject(error);
        };
      });
    });
  };

  function webApiWriteNode(config) {
    RED.nodes.createNode(this, config);
    var node = this;
    node.server = RED.nodes.getNode(config.server);
    node.webId = config.webId;
    node.piDB = config.piDB;
    node.piTag = config.piTag;

    if(node.server === null || typeof node.server === "undefined") {
      node.error(RED._('web-api.errors.authentication-method-missing'));
    };

    if(config.writeMethod === null || config.writeMethod.length === 0) {
      node.error(RED._('web-api.errors.write-method-missing'));
    };

    this.on('input', function (msg) {
      if (node.server) {
        if (!msg.hasOwnProperty('payload')) {
          node.error(RED._('web-api.errors.check-msg-format'));
        };
        switch(config.writeMethod) {
          case "webId":
            node.server.writeByWebId(node.server.httpProtocal, node.webId, config.requestMethod, msg.payload, node).then(function (result) {
              node.send(result);
            }).catch(function (e) {
              node.error(e);
            });
            break;

          case "path":
            if (config.piDB === null || config.piDB.length === 0 || config.piTag === null || config.piTag.length === 0) {
              node.error(RED._('web-api.errors.path-element-missing'));
            } else {
              node.piDB = config.piDB;
              node.piTag = config.piTag;
              var path = '\\\\' + node.piDB.concat("\\", node.piTag);
              var urlparam = encodeURIComponent(path);

              node.server.queryByPath (node.server.httpProtocal, urlparam, node).then(function (result) {
                return node.server.writeByWebId(node.server.httpProtocal, result.WebId, config.requestMethod, msg.payload, node);
              }).then(function(result) {
                node.send(result);
              }).catch(function(e) {
                node.error(e);
              });
            }
            break;

          case "custom":
            node.server.writeByCustomUrl(node.server.httpProtocal, config.customUrl, config.requestMethod, msg.payload, node).then(function(result) {
              node.send(result);
            }).catch(function(e) {
              node.error(e);
            });
            break;

          default:
            node.error(RED._("web-api.errors.write-method-missing"));
            break;
        };
      } else {
        node.error(RED._("web-api.errors.client-undefined"));
      };
    });
  };

  RED.nodes.registerType("web-api-write", webApiWriteNode);

  function webApiQueryNode(config) {
    RED.nodes.createNode(this, config);
    var node = this;
    node.server = RED.nodes.getNode(config.server);
    node.webId = config.webId;
    node.dataType = config.dataType || 'value';
	
	if(config.orderBy == '1'){
		node.order = "?sortField=Name&sortOrder=Ascending";				
	} else {
		node.order = "?sortField=Name&sortOrder=Descending";
	};
	
    if(node.server === null || typeof node.server === "undefined") {
      node.error(RED._('web-api.errors.authentication-method-missing'));
    };

    if(config.queryMethod === null || config.queryMethod.length === 0) {
      node.error(RED._('web-api.errors.query-method-missing'));
    };

    this.on("input", function (msg) {
      if (node.server) {
        switch(config.queryMethod) {
          case "webId":
            if (node.webId === null || node.webId.length === 0) {
              node.error(RED._('web-api.errors.webid-missing'));
            } else {
              node.webId = config.webId;
              node.server.queryByWebId(node.server.httpProtocal, node.webId, node, node.dataType).then(function(result) {
                node.send(result);
              }).catch(function(e){
                node.error(e);
              });
            }
            break;

          case "path":
            if (config.piDB === null || config.piDB.length === 0 || config.piTag === null || config.piTag.length === 0) {
              node.error(RED._('web-api.errors.path-element-missing'));
            } else {
              node.piDB = config.piDB;
              node.piTag = config.piTag;
              var path = '\\\\' + node.piDB.concat("\\", node.piTag);
              var urlparam = encodeURIComponent(path);

              node.server.queryByPath(node.server.httpProtocal, urlparam, node).then(function(result) {
                return node.server.queryByWebId(node.server.httpProtocal, result.WebId, node, node.dataType);
              }).then(function(result) {
                node.send(result);
              }).catch(function(e){
                node.error(e);
              });
            };
            break;

          case "custom":
            node.customUrl = config.customUrl + node.order;
            node.server.queryByCustomUrl(node.server.httpProtocal, node, {relativeUrl: node.customUrl}).then(function(result) {
              node.send(result);
            }).catch(function(e){
              node.error(e);
            });
            break;

          case "listAllAssetDb":
            var assetDb = [];
            var promises = [];

            var getDb = function(url, node) {
              return new Promise(function(resolve, reject) {
                resolve(node.server.queryByCustomUrl(node.server.httpProtocal, node, {fullUrl:url}));
              })
            };

            node.server.queryByCustomUrl(node.server.httpProtocal, node, {relativeUrl:'/assetservers'}).then(function(result) {
              return result.Items.forEach(function(assetServer) {
                var p = getDb(assetServer.Links.Databases, node).then(function(result) {
                  assetDb.push(result);
                  return;
                });
                promises.push(p);
              })
            }).then(function() {
              Promise.all(promises).then(function(){
                node.send(assetDb);
              }).catch(function(e){
                node.error(e)
              });
            }).catch(function(e) {
              node.error(e);
            });
            break;

          case "listAllDataServers":
            node.server.queryByCustomUrl(node.server.httpProtocal, node, {relativeUrl:'/dataservers'}).then(function(result) {
              node.send(result);
            }).catch(function(e){
              node.error(e)
            });
            break;

          case "listAllAssetServers":
            node.server.queryByCustomUrl(node.server.httpProtocal, node, {relativeUrl:'/assetservers'}).then(function(result) {
              node.send(result);
            }).catch(function(e){
              node.error(e)
            });
            break;

          case "listAllPoints":
            var points = [];
            var promises = [];

            var getDataServers = function(url, node) {
              return new Promise(function(resolve, reject) {
                resolve(node.server.queryByCustomUrl(node.server.httpProtocal, node, {fullUrl:url}));
              })
            };

            node.server.queryByCustomUrl(node.server.httpProtocal, node, {relativeUrl:'/dataservers'}).then(function(result) {
              return result.Items.forEach(function(assetServer) {
                var p = getDataServers(assetServer.Links.Points, node).then(function(result) {
                  points.push(result);
                  return;
                });
                promises.push(p);
              })
            }).then(function() {
              Promise.all(promises).then(function(){
                node.send(points);
              }).catch(function(e){
                node.error(e)
              });
            }).catch(function(e) {
              node.error(e);
            });
            break;

          default:
            node.error(RED._("web-api.errors.query-method-missing"));
            node.server.queryByCustomUrl(node.server.httpProtocal, node, '');
            break;
        };
      } else {
        node.error(RED._("web-api.errors.client-undefined"));
      };
    });
  };

  RED.nodes.registerType("web-api-query", webApiQueryNode);
};
