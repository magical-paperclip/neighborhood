import Airtable from "airtable";

const base = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY,
}).base(process.env.AIRTABLE_BASE_ID);

const USERS_TABLE = "neighbors";

export async function checkUser(token) {
  if (!token) return null;

  try {
    const records = await base("neighbors")
      .select({
        filterByFormula: `{token} = '${token}'`,
        maxRecords: 1,
      })
      .firstPage();

    if (records && records.length > 0) {
      return true;
    }

    return false;
  } catch (error) {
    return false;
  }
}
