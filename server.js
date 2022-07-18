const express = require('express');
const app = express();
const path = require('path');

// React 연동
app.use(express.static(path.join(__dirname, 'app/build')));

// CORS policy
app.use(express.json());
const cors = require('cors');
app.use(cors());

// dotenv
require('dotenv').config();

const db_id = process.env.DB_ID;
const db_pw = process.env.DB_PW;
const db_cluster = process.env.DB_CLUSTER;
const db_name = process.env.DB_NAME;
const server_port = process.env.SERVER_PORT;
const db_url = 'mongodb+srv://' + db_id + ':' + db_pw + '@' + db_cluster + '.pygfy.mongodb.net/?retryWrites=true&w=majority';
let db;
const MongoClient = require('mongodb').MongoClient;
MongoClient.connect(db_url, (error, client)=>{
    if(error){
        return console.log(error);
    }
    db = client.db(db_name);
    app.listen(server_port, ()=>{
        console.log('listening on 8080');
    })
})


app.get('/', (req, res)=>{
    console.log('메인 들어옴');
    res.sendFile(path.join(__dirname, 'app/build/index.html'));
})

app.post('/login', (req, res)=>{
    let id = req.body.id;
    db.collection('user').findOne({id: id}, (error, result)=>{
        if(result){
            res.send({code: 1, msg: '기존 아디 로그인', data: result});
        } else {
            db.collection('user').insertOne({id: id}).then((result)=>{
                res.send({code: 2, msg: '생성 후 로그인', data: {_id: result.insertedId, id: id}});
            })
        }
    })

})

app.get('*', (req, res)=>{
    console.log('*로 들어옴');
    res.sendFile(path.join(__dirname, 'app/build/index.html'));
})