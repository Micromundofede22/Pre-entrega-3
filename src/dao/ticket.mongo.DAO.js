import { ticketModel } from "../models/ticket.models.js";

export default class TicketMongoDAO{
    getAll= async()=> await ticketModel.find().lean().exec() 
    create= async(data)=> await ticketModel.create(data)
}
