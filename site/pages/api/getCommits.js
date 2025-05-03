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
    const userRecords = await base(process.env.AIRTABLE_TABLE_ID)
      .select({
        filterByFormula: `{token} = '${token}'`,
        maxRecords: 1,
      })
      .firstPage();

    if (userRecords.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const userEmail = userRecords[0].fields.email || userRecords[0].id;

    // Get all commits attributed to this user's email
    const commits = await base("commits")
      .select({
        filterByFormula: `{neighbor} = '${userEmail}'`,
        fields: [
          "commitID",
          "message",
          "githubLink",
          "videoLink",
          "commitTime",
          "sessions",
          "neighbor",
          "Type",
          "hackatimeProject",
        ],
        sort: [{ field: "commitTime", direction: "desc" }],
      })
      .all();

    // Fetch session details for each commit
    const commitsWithSessions = await Promise.all(
      commits.map(async (commit) => {
        const sessionIds = commit.fields.sessions || [];
        if (sessionIds.length === 0) {
          return { ...commit, sessionDetails: [] };
        }

        // Create a filter formula that checks for any of the session IDs
        const sessionFilterFormula = sessionIds
          .map((id) => `RECORD_ID()='${id}'`)
          .join(",");
        const formula = `OR(${sessionFilterFormula})`;

        const sessions = await base("sessions")
          .select({
            filterByFormula: formula,
            fields: [
              "sessionID",
              "neighbor",
              "startTime",
              "endTime",
              "duration",
              "commit",
              "hackatimeProject",
              "approved",
            ],
          })
          .all();

        return { ...commit, sessionDetails: sessions };
      }),
    );

    return res.status(200).json(commitsWithSessions);
  } catch (error) {
    console.error("Error fetching commits:", error);
    return res
      .status(500)
      .json({ message: "Error fetching commits", error: error.message });
  }
}
