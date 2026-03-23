import { MultiServerMCPClient } from "@langchain/mcp-adapters";

export const getMCPTools = async() => {
  const mpcClient = new MultiServerMCPClient({
    filesystem: {
      transport: 'stdio',
      command: 'npx',
      args: [
        '-y',
        '@modelcontextprotocol/server-filesystem',
        process.cwd()
      ]
    }
  })

  return mpcClient.getTools()
}