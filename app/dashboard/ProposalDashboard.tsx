"use client"

export default function ProposalDashboard() {
  return (
    <div className="p-6 bg-white rounded-xl shadow">
      <h2 className="text-xl font-bold">Proposal Generator</h2>

      <p className="text-gray-600 mt-2">
        Create proposals for universities and institutional partners.
      </p>

      <button className="mt-4 bg-blue-600 text-white px-4 py-2 rounded">
        Generate New Proposal
      </button>
    </div>
  )
}