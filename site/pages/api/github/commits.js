import { Octokit } from "@octokit/rest";

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { repoPath } = req.query;

  if (!repoPath) {
    return res.status(400).json({ error: 'Repository path is required' });
  }

  try {
    // Clean up the repo path - handle both URL and owner/repo format
    let cleanRepoPath = repoPath;
    if (repoPath.includes("github.com")) {
      // Handle full URLs with optional .git extension
      cleanRepoPath = repoPath
        .replace(/https?:\/\/github\.com\//, "")
        .replace(/\.git$/, "")
        .replace(/\/$/, ""); // Remove trailing slash
    }

    // Remove any extra segments after owner/repo
    cleanRepoPath = cleanRepoPath.split("/").slice(0, 2).join("/");

    if (!cleanRepoPath.includes("/")) {
      return res.status(400).json({ error: 'Invalid repository format. Expected owner/repo' });
    }

    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN
    });

    let allCommits = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const { data: commits } = await octokit.repos.listCommits({
        owner: cleanRepoPath.split('/')[0],
        repo: cleanRepoPath.split('/')[1],
        per_page: 100,
        page: page
      });

      // Filter out merge commits and add to all commits
      const filteredCommits = commits
        .filter(commit => !commit.commit.message.toLowerCase().includes('merge'))
        .map(commit => ({
          sha: commit.sha,
          message: commit.commit.message,
          date: new Date(commit.commit.author.date).getTime(),
          url: commit.html_url
        }));

      allCommits = [...allCommits, ...filteredCommits];

      // Check if we've reached the end
      hasMore = commits.length === 100;
      page++;
    }

    return res.status(200).json({ commits: allCommits });
  } catch (error) {
    console.error('Error fetching GitHub commits:', error);
    return res.status(500).json({ error: 'Failed to fetch GitHub commits' });
  }
} 