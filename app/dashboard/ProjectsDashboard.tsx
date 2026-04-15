"use client"

export default function ProjectsDashboard() {
  return (
    <div className="p-6 bg-white rounded-xl shadow">
      <h2 className="text-xl font-bold">Projects Dashboard</h2>
      <p className="text-gray-600 mt-2">
        Track all consultancy and recruitment projects.
      </p>

      <div className="grid grid-cols-3 gap-4 mt-4">
        <div className="p-4 bg-blue-100 rounded-lg">
          Active Projects
          <div className="text-2xl font-bold">12</div>
        </div>

        <div className="p-4 bg-green-100 rounded-lg">
          Completed
          <div className="text-2xl font-bold">48</div>
        </div>

        <div className="p-4 bg-yellow-100 rounded-lg">
          Revenue Generated
          <div className="text-2xl font-bold">$124K</div>
        </div>
      </div>
    </div>
  )
}