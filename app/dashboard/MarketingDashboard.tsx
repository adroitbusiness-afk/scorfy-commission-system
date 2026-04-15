"use client"

import GamifiedCard from "./GamifiedCard"

export default function MarketingDashboard(){

return(

<div>

<h1 className="text-2xl font-bold mb-6">Marketing Automation</h1>

<div className="grid grid-cols-3 gap-6">

<GamifiedCard title="Campaigns" value={6} icon="ðŸ“¢" color="from-purple-600 to-indigo-600"/>

<GamifiedCard title="Leads Generated" value={120} icon="ðŸ”¥" color="from-red-600 to-orange-600"/>

<GamifiedCard title="Conversion Rate" value={28} icon="âš¡" color="from-blue-600 to-cyan-600"/>

</div>

</div>

)

}
