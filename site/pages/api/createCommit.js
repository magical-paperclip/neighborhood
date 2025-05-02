import Airtable from "airtable";

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID,
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { token, commitMessage, videoUrl, projectName, session } = req.body;

  if (!token || !commitMessage || !videoUrl || !projectName || !session) {
    return res.status(400).json({ message: "Missing required parameters" });
  }

  try {
    const userRecords = await base("neighbors")
      .select({
        filterByFormula: `{token} = '${token}'`,
        maxRecords: 1,
      })
      .firstPage();

    if (userRecords.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const userRecord = userRecords[0];
    console.log([userRecord.id]);

    const projectRecord = await base("hackatimeProjects")
      .select({
        filterByFormula: `{name} = '${projectName}'`,
        maxRecords: 1,
      })
      .firstPage();

    if (projectRecord.length === 0) {
      return res.status(404).json({ message: "Project not found" });
    }

    const commitRecord = await base("commits").create(
      [
        {
          fields: {
            message: commitMessage,
            videoLink: videoUrl,
            commitTime: new Date().toISOString(),
            sessions: [session],
            neighbor: [userRecord.id],
            hackatimeProject: [projectRecord[0].id],
          },
        },
      ],
      { typecast: true },
    );
    return res.status(201).json(commitRecord);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
