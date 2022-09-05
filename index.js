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
        await db.collection('message').insertOne({
            from: name,
            to: 'Todos',
            text: 'entra na sala....',
            type: 'status',
            time: dayjs().format("HH:mm:ss")
        });
        res.status(201).send("nome criado");
        return
    } catch (error) {
        res.status(500).send(error.message);
        return
    }
});

app.listen(5000);
