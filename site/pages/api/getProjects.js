import Airtable from "airtable";

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID,
);

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ message: "Missing token" });
  }

  try {
    const neighbor = await base("neighbors")
      .select({
        filterByFormula: `{token} = '${token}'`,
        maxRecords: 1,
      })
      .all();

    const projects = await base("hackatimeProjects")
      .select({
        filterByFormula: `{neighbor} = '${neighbor[0].id}'`,
        maxRecords: 1,
      })
      .all();
    return res.status(200).json(projects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return res.status(500).json({ message: "Error fetching projects" });
  }
}
