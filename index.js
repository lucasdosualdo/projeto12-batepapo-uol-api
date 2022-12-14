import express from 'express';
import {MongoClient} from 'mongodb';
import dotenv from 'dotenv';
import cors from 'cors';
import dayjs from 'dayjs';
import joi from 'joi';

const app = express();
app.use(express.json());
app.use(cors());
dotenv.config();

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;
    mongoClient.connect().then(()=>{
        db=mongoClient.db('project-12-uol');
    });

 const participantsSchema = joi.object({
     name: joi.string().required()
 });

 const messagesSchema = joi.object({
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.string().required().valid('message', 'private_message')
 })

app.post('/participants', async (req, res) => {
    const {name}=req.body;
    const repeatedName = await db.collection('participants').findOne({name: name});
     if (repeatedName){
         res.status(409).send('nome já existente');
         return;
     }

    const validation = participantsSchema.validate(req.body);
    if (validation.error){
        const err = validation.error.details.map(err=>err.message);
        res.status(422).send(err);
        return;
    }
    try {
        await db.collection('participants').insertOne({
            name,
            lastStatus: Date.now()
        });
        await db.collection('messages').insertOne({
            from: name,
            to: 'Todos',
            text: 'entra na sala....',
            type: 'status',
            time: dayjs().format("HH:mm:ss")
        });
        res.status(201).send("nome criado");
    } catch (error) {
        res.status(500).send(error.message);
    }
});

app.get('/participants', async (req, res)=>{
    try{
        const nameList = await db.collection('participants').find().toArray();
        res.send(nameList);
    } catch (error){
        res.status(500).send(error.message);
    }
});

app.post('/messages', async (req, res)=> {
    const {to, text, type} = req.body;
    const {user} = req.headers;
    const availableUser = await db.collection('participants').findOne({name: user});
    if (!availableUser){
        res.status(422).send('usuário não existente');
        return;
    }
    const validation = messagesSchema.validate(req.body);
    if (validation.error){
        const err = validation.error.details.map(err=>err.message);
        res.status(422).send(err);
        return;
    }
    try {
        await db.collection('messages').insertOne({
            from: user,
            to,
            text,
            type,
            time: dayjs().format("HH:mm:ss")
        });
        res.status(201).send('mensagem enviada')
    } catch (error){
        res.status(500).send(error.message);
    }
});

app.get('/messages', async (req, res)=> {
    const limit = parseInt(req.query.limit);
    const {user}=req.headers;
    try{
        const publicMessages = await db.collection('messages').find({type: 'message'}).toArray();
        const messagesFromUser = await db.collection('messages').find({
            type: 'private_message',
            from: user
        }).toArray();
        const messagesToUser = await db.collection('messages').find({
            type: 'private_message',
            to: user
        }).toArray();
        let messagesList = publicMessages.concat(messagesFromUser, messagesToUser);
        messagesList = messagesList.sort((a, b)=> a.time.localeCompare(b.time));
        if (limit && limit !== NaN){
            res.send(messagesList.slice(-limit));
            return;
        }
        res.send(messagesList);    
    } catch (error){
        res.status(500).send(error.message);
    }
});

app.post('/status', async (req, res)=>{
    const {user}=req.headers;
    const availableUser = await db.collection('participants').findOne({name: user});
    if (!availableUser){
        res.sendStatus(404);
        return;
    }
    try{
        await db.collection('participants').updateOne(
            {name: user},
            {$set: {lastStatus: Date.now()}
            });
            res.sendStatus(200);
    } catch(error){
        res.status(500).send(error.message);
    }
});

 async function removeInactiveUsers() {
   const maxActiveTime = 10*1000;
   const currentTime = Date.now();
   try{
    let nameList = await db.collection('participants').find().toArray();
    nameList = nameList.map(async time=>{
        if ((currentTime-time.lastStatus) > maxActiveTime){
            await db.collection('participants').deleteOne({lastStatus: time.lastStatus});
            await db.collection('messages').insertOne({
                from: time.name,
                to: 'Todos',
                text: 'sai da sala...',
                type: 'status',
                time: dayjs().format("HH:mm:ss")
            })
        }
    });
   } catch (error) {
    return error.message
   }
 }

setInterval(removeInactiveUsers, 15000)

app.listen(5000);
