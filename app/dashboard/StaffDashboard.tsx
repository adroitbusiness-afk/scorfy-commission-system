"use client"

import {useState,useEffect} from "react"
import { supabase } from "../../lib/supabase/client"
import GamifiedCard from "./GamifiedCard"

export default function StaffDashboard(){

const [staff,setStaff]=useState(0)

useEffect(()=>{

async function load(){

const {data}=await supabase.from("staff").select("*")

setStaff(data?.length||0)

}

load()

},[])

return(

<div>

<h1 className="text-2xl font-bold mb-6">Staff Operations</h1>

<GamifiedCard title="Active Staff" value={staff} icon="🧑‍💼" color="from-blue-600 to-cyan-600"/>

</div>

)
}