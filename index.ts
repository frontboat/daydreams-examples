import { createDreams, context, action, LogLevel } from "@daydreamsai/core";
import { cliExtension } from "@daydreamsai/cli";
import { anthropic } from "@ai-sdk/anthropic"; // Or your preferred LLM provider
import { z } from "zod";


// 1. Define the context to store animal facts
const animalFactsContext = context({
  type: "animalFacts",
  // Simple schema, using 'default' as the ID for a single instance
  schema: z.object({
    id: z.string().default("default"),
  }),
  // Key function using the ID
  key: ({ id }) => id,
  // Initialize the memory for this context
  create: (state) => {
    return {
      latestDogImageUrl: null as string | null,
      latestCatFact: null as string | null,
    };
  },
  // Instructions for the LLM
  instructions:
    "You are an agent that can fetch random dog images and cat facts. When asked, use the available actions. Inform the user about the latest fetched data if available.",
  // Render the current state for the LLM
  render: ({ memory }) => {
    let output = "Current knowledge:\n";
    if (memory.latestDogImageUrl) {
      output += `- Latest Dog Image URL: ${memory.latestDogImageUrl}\n`;
    } else {
      output += "- No dog image fetched yet.\n";
    }
    if (memory.latestCatFact) {
      output += `- Latest Cat Fact: ${memory.latestCatFact}\n`;
    } else {
      output += "- No cat fact fetched yet.\n";
    }
    return output;
  },
});

// 2. Define the action to get a dog image
const getDogImage = action({
  name: "getDogImage",
  description: "Fetches a random dog image URL.",
  schema: z.object({}), // No arguments needed
  handler: async (args, ctx, agent) => {
    try {
      const response = await fetch("https://dog.ceo/api/breeds/image/random");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = (await response.json()) as { message: string; status: string };

      if (data.status !== "success") {
        throw new Error("Dog API did not return success status.");
      }

      const imageUrl = data.message;

      // Retrieve the full context state
      const contextState = await agent.getContextById(ctx.id);
      if (!contextState) {
          throw new Error(`Could not find context state for id: ${ctx.id}`);
      }

      // Update context memory on the retrieved state
      contextState.memory.latestDogImageUrl = imageUrl;
      // Save the updated context state
      await agent.saveContext(contextState);

      return {
        success: true,
        imageUrl: imageUrl,
        message: `Fetched dog image URL: ${imageUrl}`,
      };
    } catch (error: any) {
      console.error("Error fetching dog image:", error);
      return {
        success: false,
        error: error.message,
        message: "Failed to fetch dog image.",
      };
    }
  },
});

// 3. Define the action to get a cat fact
const getCatFact = action({
  name: "getCatFact",
  description: "Fetches a random cat fact.",
  schema: z.object({}), // No arguments needed
  handler: async (args, ctx, agent) => {
    try {
      const response = await fetch("https://catfact.ninja/fact");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = (await response.json()) as { fact: string; length: number };

      const fact = data.fact;

      // Retrieve the full context state
      const contextState = await agent.getContextById(ctx.id);
      if (!contextState) {
          throw new Error(`Could not find context state for id: ${ctx.id}`);
      }

      // Update context memory on the retrieved state
      contextState.memory.latestCatFact = fact;
      // Save the updated context state
      await agent.saveContext(contextState);


      return {
        success: true,
        fact: fact,
        message: `Fetched cat fact: ${fact}`,
      };
    } catch (error: any) {
      console.error("Error fetching cat fact:", error);
      return {
        success: false,
        error: error.message,
        message: "Failed to fetch cat fact.",
      };
    }
  },
});

// 4. Create the agent instance
const agent = createDreams({
  // Ensure you have ANTHROPIC_API_KEY in your .env file or environment
  model: anthropic("claude-3-7-sonnet-latest"), // Use your preferred model
  logger: LogLevel.DEBUG, // Use LogLevel.DEBUG for more details
  extensions: [cliExtension],
  contexts: [animalFactsContext],
  actions: [getDogImage, getCatFact],
});

// 5. Start the agent and run the context
async function main() {
  console.log("Starting agent...");
  // Start agent services (like CLI reader)
  await agent.start();

  console.log("Agent started. Ask me for a dog image or a cat fact! Type 'exit' to quit.");

  // Run the main context. The cliExtension will handle user input.
  await agent.run({
    context: animalFactsContext,
    args: { id: "default" }, // Use the default ID defined in the schema
  });

  // Agent stops when the input loop breaks (e.g., user types "exit")
  console.log("Agent stopped.");
}

main().catch(console.error);



