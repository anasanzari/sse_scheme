'use strict';

const http = require('http');
const express = require('express');
const fs = require('fs'); //filesystem
const datastore = require('nedb');
const app = express();
const aesjs = require('aes-js');

var p = function(e){
    if(e){
        console.log(e);
    }
    return e;
};

const configJson = fs.readFileSync('./config.json');
const config = JSON.parse(configJson);

var aes_key = aesjs.util.convertStringToBytes(config.sse.aes_key);
var aes_iv = aesjs.util.convertStringToBytes(config.sse.aes_iv);

const db = new datastore({
    filename : './client/index.db'
});


var encrypt = function(text){
    var textBytes = aesjs.util.convertStringToBytes(text);
    var aesCbc = new aesjs.ModeOfOperation.cbc(aes_key, aes_iv);
    var encryptedBytes = aesCbc.encrypt(textBytes);
    return encryptedBytes;
};

var decrypt = function(encryptedBytes){
    var aesCbc = new aesjs.ModeOfOperation.cbc(aes_key, aes_iv);
    var decryptedBytes = aesCbc.decrypt(encryptedBytes);
    var decryptedText = aesjs.util.convertBytesToString(decryptedBytes);
    console.log(decryptedText);
    return decryptedText;
};

var stob = function(s){
    return aesjs.util.convertBytesToString(s);
};

var btos = function(s){
    return aesjs.util.convertStringToBytes(s);
};

var encrypt_file = function(i_file_url,o_file_url){
    var content = fs.readFileSync(i_file_url);
    content += new Array(16-content.length%16 + 1 ).join(' '); //empty string as pad
    var encryptedBytes = '';
    for(var i=0;i<content.length/16;i++){
        encryptedBytes += encrypt(content.substr(i*16,i*16+16));
    }
    console.log(encryptedBytes);
    fs.writeFile(o_file_url, encryptedBytes, function(err) {
        p(err);
    });
};

var decrypt_file = function(i_file_url,o_file_url){
    var content = fs.readFileSync(i_file_url);
    console.log('check---');
    console.log(content);
    return;

    fs.open(i_file_url, 'r', function(status, fd) {
        var buffer = new Buffer(16);
        fs.read(fd, buffer, 0, 16, 0, function(err, num) {
            console.log(buffer.toString('utf8', 0, num));
        });
    });

    /*fs.writeFile(o_file_url, decryptedBytes , function(err) {
        p(err);
    });*/
};

encrypt_file('./sample.txt','./client/encrypted/sample.txt.encrypted');
decrypt_file('./client/encrypted/sample.txt.encrypted','./sample2.txt');



db.loadDatabase(function(err){
    p(err);
    var doc = { _id: 'id', check: 'check'};
    /*db.insert(doc,function(err,newDoc){
        console.log(err);
    });*/
})

/*
app.use(express.static(config.webServer.folder));

const httpServer = http.createServer(app);
httpServer.listen(config.webServer.port,function(err){
    if(err){
        console.log(err.message);
        return;
    }
    console.log('listening on '+config.webServer.port);
});*/

var check = function(){
    var word = 'cat'; var doc_id = "sample";
    var k1 = prf(prf_passphrase, "1" + word);
    var k2 = prf(prf_passphrase, "2" + word);
    console.log('k1 :'+k1.toString());
    console.log('k2: '+k2.toString());
    var c = 0;

    var l = prf(k1,c).toString();
    console.log('l: '+l);
    var d = encrypt(doc_id,k2.toString()).toString();
    console.log('d: '+d);
    var m = decrypt(d,k2.toString());
    console.log('m: '+m);

};
