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

app.listen(5000);
