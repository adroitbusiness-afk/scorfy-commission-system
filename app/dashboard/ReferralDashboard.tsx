"use client"

import GamifiedCard from "./GamifiedCard"

export default function ReferralDashboard(){

return(

<div>

<h1 className="text-2xl font-bold mb-6">Referral Engine</h1>

<div className="grid grid-cols-3 gap-6">

<GamifiedCard title="Referral Leads" value="85" icon="🔗" color="from-indigo-600 to-purple-600"/>

<GamifiedCard title="Top Referrer" value="John" icon="🏆" color="from-yellow-500 to-orange-600"/>

<GamifiedCard title="Rewards Earned" value="K12,000" icon="💎" color="from-green-600 to-teal-600"/>

</div>

</div>

)

}