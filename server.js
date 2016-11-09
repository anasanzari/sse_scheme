'use strict';

const http = require('http');
const express = require('express');
const fs = require('fs'); //filesystem
const datastore = require('nedb');
const app = express();
const bodyParser = require('body-parser');
const CryptoJS = require("crypto-js");
const async = require("async");

var p = function(e){
    if(e){
        console.log(e);
    }
    return e;
};

const configJson = fs.readFileSync('./config.json');
const config = JSON.parse(configJson);

app.use(express.static(config.remoteServer.folder));
app.use(bodyParser.json());

const index_db = new datastore({
    filename : config.serverdb.index
});
index_db.loadDatabase();

var prf = function(passphrase,t){
    var hash = CryptoJS.HmacSHA256(t, passphrase);
    return hash;
};

var encrypt = function(text,passphrase){
    var ciphertext = CryptoJS.AES.encrypt(text, passphrase);
    return ciphertext;
};

var decrypt = function(ciphertext,passphrase){
    var bytes  = CryptoJS.AES.decrypt(ciphertext, passphrase);
    var plaintext = bytes.toString(CryptoJS.enc.Utf8);
    return plaintext;
};


app.post('/setup', function (req, res) {
  var l = req.body.data;
  console.log('received edb');
  console.log(l);

  async.forEach(l, function (obj, callback){
      index_db.update({ _id : obj.l }, { $set: { d : obj.d }}, {upsert:true}, function (err, numReplaced) {

      });
      callback();
  }, function(err) {
      console.log('Done.')
      res.json({status:'success'});
  });

});

app.post('/search', function (req, res) {
  console.log('Search request recieved.');
  var k1 = req.body.k1;
  var k2 = req.body.k2;
  console.log('k1: '+k1);
  console.log('k2: '+k2);
  var c = 0;
  var l = prf(k1.toString(),c.toString()).toString();
  var result = true;
  var doc_ids = [];
  async.doWhilst(function(callback) {
      index_db.findOne({ _id: l }, function (err, doc) {
          console.log(doc);
          if(doc){
              var m = decrypt(doc.d,k2);
              doc_ids.push(m);
              c++;
              l = prf(k1.toString(),c.toString()).toString();
          }else{
              result = false;
          }
          callback();
      });

    }, function(){
      return result;
  }, function(err) {
      res.json(doc_ids);
  });


});

const httpServer = http.createServer(app);
httpServer.listen(config.remoteServer.port,function(err){
    if(err){
        console.log(err.message);
        return;
    }
    console.log('listening on '+config.remoteServer.port);
});
