import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";
import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User";
import { User } from "next-auth";
import mongoose from "mongoose";

export async function GET(request: Request){
    await dbConnect()

    const session = await getServerSession(authOptions)
    const user: User = session?.user

    if(!session || !session.user){
        return Response.json(
            {
                success: false,
                message: "Not Authenticated"
            },
            {status: 401}
        )
    }

    const userId = new mongoose.Types.ObjectId(user._id);
    try {
        //  This code is using MongoDB's aggregation framework to query for a user, 
        // process their messages, and return them in descending order by creation date.
        const user = await UserModel.aggregate([
            { $match: {id: userId}},
            // $unwind: Breaks down the messages array so each message becomes its own document. 
            // This is useful for processing each message individually.
            { $unwind: '$messages'},
            // $sort: Orders the messages by createdAt in descending order (-1 means descending). 
            // This ensures the newest messages come first.
            { $sort: {'messages.createdAt': -1}},
            // $group: Regroups the documents by the user's _id and 
            // pushes each message back into an array called messages, maintaining the sorted order.
            { $group: {_id: '$_id',message: {$push: '$messages'}}}
        ])
        if(!user || user.length === 0){
           return Response.json(
            {
                success: false,
                message: "User not found"
            },{status: 401}
           ) 
        }

        return Response.json(
            {
                success: true,
                messages: user[0].messages
            },{status: 200}
        ) 

    } catch (error) {
        console.error('An unexpected error occurred:', error);
        return Response.json(
            { message: 'Internal server error', success: false },
            { status: 500 }
        );
    }

}