'use strict';

const http = require('http');
const express = require('express');
const fs = require('fs'); //filesystem
const datastore = require('nedb');
const app = express();
const unirest = require('unirest');

const CryptoJS = require("crypto-js");

var p = function(e){
    if(e){
        console.log(e);
    }
    return e;
};

const configJson = fs.readFileSync('./config.json');
const config = JSON.parse(configJson);

const aes_passphrase = config.sse.aes_passphrase;
const prf_passphrase = config.sse.prf_passphrase;

const index_db = new datastore({
    filename : config.clientdb.index
});

const index_id_db = new datastore({
    filename : config.clientdb.index_id
});

var load = 0;
var callback = function(err){
    load++;
    if(load==2){
        //both db loaded
        sync();
    }
};
index_db.loadDatabase(callback);
index_id_db.loadDatabase(callback);

/*var doc = { _id: 'id', check: 'check'};
db.insert(doc,function(err,newDoc){
    console.log(err);
});*/


var encrypt = function(text,passphrase){
    var ciphertext = CryptoJS.AES.encrypt(text, passphrase);
    return ciphertext;
};

var decrypt = function(ciphertext, passphrase){
    var bytes  = CryptoJS.AES.decrypt(ciphertext, passphrase);
    var plaintext = bytes.toString(CryptoJS.enc.Utf8);
    return plaintext;
};

var encrypt_file = function(i_file_url,o_file_url){
    var content = fs.readFileSync(i_file_url);
    var ciphertext = encrypt(content.toString(), aes_passphrase);
    fs.writeFile(o_file_url, ciphertext.toString(), function(err) {
        p(err);
    });
};

var decrypt_file = function(i_file_url,o_file_url){
    var content = fs.readFileSync(i_file_url);
    var plaintext = decrypt(content.toString(),aes_passphrase);
    fs.writeFile(o_file_url, plaintext , function(err) {
        p(err);
    });
};

//encrypt_file('./sample.txt','./client/encrypted/sample.enc');
//decrypt_file('./client/encrypted/sample.enc','./client/decrypted/sample.txt');


var setup = function(document_url,doc_id){
    var document = fs.readFileSync(document_url);
    var wordlist = document.toString().split(" ");
    for(var i=0;i<wordlist.length;i++){
        var w = wordlist[i];
        inc_count(w);
        addtoID(w,doc_id);
    }
};

var setup_helper = function(word){

    var k1 = prf(prf_passphrase, "1" + word);
    var k2 = prf(prf_passphrase, "2" + word);

    var c = 0;
    var edb = [];
    index_id_db.findOne({'_id': word }, function (err, doc) {
        var ids = doc.ids;
        for(var i=0;i<ids.length;i++){
            var l = prf(k1.toString(),c.toString()).toString();
            var d = encrypt(ids[i],k2.toString()).toString();
            c++;
            var obj = {l:l,d:d};
            edb.push(obj);
        }

        console.log(word+' sending edb:');
        console.log(edb);
        send('/setup',{data:edb},function(response){
            console.log(response.body);
        });


    });
};

var setup2 = function(){
    index_db.find({}, function (err, docs) {
        for(var i=0;i<docs.length;i++){
            setup_helper(docs[i]._id);
        }
    });
}


var prf = function(passphrase,t){

    var hash = CryptoJS.HmacSHA256(t, passphrase);
    return hash;
};


var inc_count = function(word){

    index_db.findOne({ _id: word }, function (err, doc) {

        var c = 0;
        if(doc){
            c = doc.count;
        }
        index_db.update({ _id : word }, { $set: { count : c+1 }}, {upsert:true}, function (err, numReplaced) {

        });

    });
};

var addtoID = function(word,doc_id){
    index_id_db.findOne({ _id: word }, function (err, doc) {
        var ids = [];
        if(doc){
            ids = doc.ids;
        }
        ids.push(doc_id);
        index_id_db.update({ _id : word }, { $set: { ids : ids }}, {upsert:true}, function (err, numReplaced) {

        });

    });
}

var encrypt_index = function(wordlist,doc_id,callback){
    for(var i=0;i<wordlist.length;i++){
        var w = wordlist[i];
        inc_count(w);
        addtoID(w,doc_id);
        // console.log("word:"+w);
        // var k1 = prf(prf_passphrase, "1" + w);
        // var k2 = prf(prf_passphrase, "2" + w);
        // //get current word count

    }

};

var send = function(endpoint,data,callback){
    unirest.post('http://localhost:'+config.remoteServer.port+endpoint)
    .headers({'Accept': 'application/json', 'Content-Type': 'application/json'})
    .send(data)
    .end(function (response) {
        callback(response);
    });
}

var search = function(word){
    var k1 = prf(prf_passphrase, "1" + word);
    var k2 = prf(prf_passphrase, "2" + word);
    console.log('k1 :'+k1.toString());
    console.log('k2: '+k2.toString());
    var c = 0;
    var l = prf(k1.toString(),c.toString()).toString();
    console.log('l: '+l);
    send('/search',{k1:k1.toString(),k2:k2.toString()},function(response){
        console.log(response.body);
    });
}

var sync = function(){
    
    switch (process.argv[2]){
        case 'setup':
            if(process.argv.length<5){
                console.log("Please provide arguments for file and word in setup.")
            }
            else
            setup(process.argv[3].toString().trim(),process.argv[4].toString().trim());
        break;
        case 'search':
            if(process.argv.length<4){
                console.log("Please provide word to search for.")
            }
            else
            search(process.argv[3].toString().trim());
        break;
        case 'send':
            setup2();
        break;
    default:
            console.log("Invalid arguments\n");

     }
     /*
//console.log(process.argv.length);
//  console.log('App');
//setup('./sample.txt','rome');
    //setup2();
   // search('just');
    //check();
    */
};

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
