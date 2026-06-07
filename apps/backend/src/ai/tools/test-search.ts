import { searchTool } from "./webSearch.tool";

async function main() {
  try {
    const result = await searchTool.execute?.(
      {
        query: "NestJS latest version",
      },
      {
        toolCallId: "test",
        messages: [],
      }
    );

    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("ERROR:", error);
  }
}

main();