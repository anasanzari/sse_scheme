'use strict';

const http = require('http');
const express = require('express');
const fs = require('fs'); //filesystem
const datastore = require('nedb');
const app = express();
const unirest = require('unirest');
const async = require("async");
const CryptoJS = require("crypto-js");
const multer  = require('multer');
const bodyParser = require('body-parser');



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

var index_db,index_id_db;

var setupDatabases = function(){
    index_db = new datastore({
        filename : config.clientdb.index
    });

    index_id_db = new datastore({
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
};

setupDatabases();

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

    async.forEach(wordlist, function (item, callback){
        inc_count(item);
        addtoID(item,doc_id);
        callback();
    }, function(err) {
        console.log(doc_id+' is added successfully');
    });
};

var p = function(a,b,c){
    console.log('l: '+a);
    console.log('d: '+b);
    console.log('c: '+c);
}

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

var encryptAndSend = function(cb){


    var edb = [];
    index_id_db.find({}, function (err, docs) {
        for(var j=0;j<docs.length;j++){
            var c = 0;
            var ids = docs[j].ids;
            var word = docs[j]._id;
            var k1 = prf(prf_passphrase, "1" + word);
            var k2 = prf(prf_passphrase, "2" + word);
            for(var i=0;i<ids.length;i++){
                var l = prf(k1.toString(),c.toString()).toString();
                var d = encrypt(ids[i],k2.toString()).toString();
                c++;
                var obj = {l:l,d:d};
                edb.push(obj);
            }
        }
        console.log(edb);
        send('/setup',{data:edb},function(response){
            console.log(response.body);
            cb(edb);
        });
    });

};

var getIndexID = function(cb){
    index_id_db.find({}, function (err, docs) {
        cb(docs);
    });
};


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

var send = function(endpoint,data,callback){
    unirest.post('http://127.0.0.1:'+config.remoteServer.port+endpoint)
    .headers({'Accept': 'application/json', 'Content-Type': 'application/json'})
    .send(data)
    .end(function (response) {
        callback(response);
    });
}

var search = function(word,cb){
    var k1 = prf(prf_passphrase, "1" + word);
    var k2 = prf(prf_passphrase, "2" + word);
    console.log('k1 :'+k1.toString());
    console.log('k2: '+k2.toString());
    var c = 0;
    var l = prf(k1.toString(),c.toString()).toString();
    console.log('l: '+l);
    send('/search',{k1:k1.toString(),k2:k2.toString()},function(response){
        console.log('Search Results:');
        console.log(response.body);
        if(cb){
            cb(response.body);
        }
    });
}

var sync = function(){

    switch (process.argv[2]){
        case 'setup':
            if(process.argv.length<5){
                console.log("Please provide arguments for file and word in setup.")
            }else{
                setup(process.argv[3].toString().trim(),process.argv[4].toString().trim());
            }
            break;
        case 'search':
            if(process.argv.length<4){
                console.log("Please provide word to search for.")
            }else{
                search(process.argv[3].toString().trim());
            }
            break;
        case 'send':
            encryptAndSend();
            break;
        case 'browse':
            browse();
            break;
    default:
            console.log("\nInsufficient arguments. Please provide arguments in the following manner.\n");
            console.log('---------------------------');
            console.log('Commands:');
            console.log('node index setup fileurl docid');
            console.log('   : Parses the file and creates/updates local index.');
            console.log('node index send');
            console.log('    : Sends encrypted database (EDB) to server.');
            console.log('node index search searchterm');
            console.log('   : Sends request(k1,k2) to server to search for the searchterm.')
            console.log('node index browse');
            console.log('   : Starts a localserver for a webinterface.');

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

var browse = function(){
    app.use(express.static(config.webServer.folder));

    var storage = multer.memoryStorage();
    var upload = multer({ storage: storage });

    const httpServer = http.createServer(app);
    httpServer.listen(config.webServer.port,function(err){
        if(err){
            console.log(err.message);
            return;
        }
        console.log('serving running at http://localhost:'+config.webServer.port+'/');
    });

    /*app.post('/clear',function(req,res){

    });*/

    app.post('/setup', upload.single('file'),function (req, res) {
      var doc_id = req.body.docid;
      var document = req.file.buffer.toString();
      var wordlist = document.toString().trim().split(" ");
      async.forEach(wordlist, function (item, callback){
          inc_count(item);
          addtoID(item,doc_id);
          callback();
      }, function(err) {
          console.log(doc_id+' is added successfully');
          setTimeout(function() {
              getIndexID(function(docs){
                  res.json(docs);
              });
          },1000);
      });
    });

    app.post('/send',function(req,res){
        encryptAndSend(function(edb){
            res.json(edb);
        })
    });
    var jsonParser = bodyParser.json();
    app.post('/search',jsonParser,function(req,res){
        var term = req.body.term.trim();
        console.log('Search request for '+term);
        search(''+term,function(val){
            res.json(val);
        });
    });

};
