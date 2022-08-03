const express = require('express');
const app = express();
const path = require('path');

// MongoDB ObjectId()
const { ObjectId } = require('mongodb');

// React 연동
app.use(express.static(path.join(__dirname, 'app/build')));

// CORS policy
app.use(express.json());
const cors = require('cors');
app.use(cors());

// dotenv
require('dotenv').config();

// body-parser
app.use(express.urlencoded({extended: true}))

const crypto = require('crypto');

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

function testFn(){

}

app.get('/', (req, res)=>{
    console.log('메인 들어옴');
    res.sendFile(path.join(__dirname, 'app/build/index.html'));
})

app.post('/login', (req, res)=>{
    testFn();
    let name = req.body.name;
    db.collection('user').findOne({name: name}, (error, result)=>{
        if(result){
            res.send({code: 1, msg: '기존 아디 로그인', data: result});
        } else {
            db.collection('user').insertOne({name: name}).then((result)=>{
                res.send({code: 2, msg: '생성 후 로그인', data: {_id: result.insertedId, name: name}});
            })
        }
    })

})

app.get('/list', (req, res)=>{
    let _id = ObjectId(req.query._id);
    db.collection('group').find({ members: { $elemMatch: { _id: _id} } }).toArray().then((result)=>{
        res.send(result);
    })

    // --새그룹만들기--
    // let members = [
    //     {_id: ObjectId('62cfd01aa89591c1c72027c0'), id: 'test', rank: 'master'}, 
    //     {_id: ObjectId('62d5142ec0495cc6b894fcbc'), id: 'test2', rank: 'normal'}, 
    // ]
    // let name = '으에으이아';
    // db.collection('group').insertOne({members: members, name: name}).then((result)=>{
    //     console.log('insertId: ' + result.insertedId);
    //     res.send(result);
    // })
})

app.post('/raid', (req, res)=>{
    let name = req.body.name;
    let d_date = req.body.d_date;
    let d_time = req.body.d_time;
    let group_id = ObjectId(req.body.group_id);
    let group_name = req.body.group_name;
    let members = [{ 
        _id: ObjectId(req.body.master_id), 
        name: req.body.master_name, 
        status: 'default', 
        rank: 'master', 
     }]
    db.collection('raid').insertOne({name: name, d_date: d_date, d_time: d_time, members: members, group_id: group_id, group_name: group_name}).then((result)=>{
        res.send({code: 1, msg: '레이드 등록', data: result});
    })
})

app.get('/raids', (req, res)=>{
    let group_id = ObjectId(req.query.group_id);
    let user_id = ObjectId(req.query.user_id);
    db.collection('raid').find({ group_id: group_id, members: { $elemMatch: { _id: user_id} } }).toArray().then((result)=>{
        res.send(result);
    }).catch((error)=>{
        console.log('error: ' + error);
    })
})

app.get('/raid', (req, res)=>{
    let _id = ObjectId(req.query._id);
    db.collection('raid').findOne({ _id: _id }).then((result)=>{
        res.send(result);
    })
})

app.put('/raid/member', (req, res)=>{
    let raid_id = ObjectId(req.body.raid_id);
    let user_id = ObjectId(req.body.user_id);
    let user_name = req.body.user_name;

    db.collection('raid').findOne({ _id: raid_id, members: { $elemMatch: { _id: user_id} } }, (error, result)=>{
        if(result){
            res.send({response: 0, variant: 'warning', message: '이미 그룹에 속해있습니다.'});
        } else {
            db.collection('raid').updateOne(
                { _id: raid_id }, 
                {
                    $push: {
                        members: {
                            _id: user_id, 
                            name: user_name, 
                            status: 'default', 
                            rank: 'normal', 
                        }
                    }
                }
            ).then((result)=>{
                res.send({response: 1, variant: 'primary', message: '유저 추가 완료'});
            })
        }
    })
})

app.get('/group/code', (req, res)=>{
    let group_id = ObjectId(req.query.group_id);
    
    db.collection('invite').find({ expired: false }).toArray().then((result)=>{
        if(result){
            let code = '';
            let obj = result.find(x => x.group_id.equals(group_id));
            if(obj){  // group_id 로 데이터가 있으면 바로 code 리턴
                code = obj.code;
            } else {  // 없으면 code 생성 후 등록
                do {
                    code = crypto.randomBytes(20).toString('hex').slice(0, 5);
                } while (result.find(x => x.code == code))

                db.collection('invite').insertOne({ code: code, group_id, group_id, created_date: new Date(), expired: false }).then((result)=>{
                    console.log('insert invite code - done');
                })
            }
            res.send({ code });
        }
    })
})

app.post('/group/member', (req, res)=>{
    let code = req.body.code;
    let user_id = ObjectId(req.body.user_id);
    let user_name = req.body.user_name;

    db.collection('invite').findOne({ code: code, expired: false }).then((result)=>{
        if(result){
            let group_id = result.group_id;
            db.collection('group').findOne({ _id: group_id, members: { $elemMatch: {_id: user_id} } }).then((result)=>{
                if(result){
                    res.send({response: 0, variant: 'warning', message: '이미 그룹에 속해있습니다.'});
                } else {
                    db.collection('group').updateOne(
                        { _id: group_id }, 
                        {
                            $push: {
                                members: {
                                    _id: user_id, 
                                    name: user_name, 
                                    rank: 'normal', 
                                }
                            }
                        }
                    ).then((result)=>{
                        res.send({response: 1, variant: 'primary', message: '그룹 추가 완료'});
                    })
                }
            })
        } else {
            res.send({response: 0, variant: 'danger', message: '유효하지 않은 초대코드 입니다.'});
        }
    })
})

app.delete('/raid', (req, res)=>{
    let raid_id = ObjectId(req.body.raid_id);
    let user_id = ObjectId(req.body.user_id);

    db.collection('raid').findOne({ _id: raid_id, members: { $elemMatch: { _id: user_id, rank: 'master' } } }).then((result)=>{
        if(result){
            db.collection('raid').deleteOne({ _id: raid_id }, (error, result)=>{
                if(error) return console.log(error);
                res.send({response: 1, variant: 'primary', message: '레이드 삭제 완료'});
            })
        }
    })
})

app.put('/raid/member/status', (req, res)=>{
    let raid_id = ObjectId(req.body.raid_id);
    let user_id = ObjectId(req.body.user_id);
    let target_status = req.body.target_status;

    db.collection('raid').updateOne({ _id: raid_id, members: { $elemMatch: { _id: user_id } } }, { $set: { 'members.$.status': target_status } }).then((result)=>{
        res.send(result)
    })
})

app.get('*', (req, res)=>{
    console.log('*로 들어옴');
    res.sendFile(path.join(__dirname, 'app/build/index.html'));
})