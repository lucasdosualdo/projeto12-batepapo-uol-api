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
    const validation = participantsSchema.validate(req.body);
    if (validation.error){
        const err = validation.error.details.map(err=>err.message);
        res.status(422).send(err);
        return;
    }
    try {
        const insertName = await db.collection('participants').insertOne({
            name
        });  
        res.status(201).send("ok");
        return
    } catch (error) {
        res.status(500).send(error.message);
        return
    }
});

app.listen(5000);
