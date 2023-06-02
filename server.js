const http = require("http");
const url = require("url");
const { OpenAI } = require("langchain/llms/openai");
const {
  ContextualCompressionRetriever,
} = require("langchain/retrievers/contextual_compression");
const {
  LLMChainExtractor,
} = require("langchain/retrievers/document_compressors/chain_extract");
const { HNSWLib } = require("langchain/vectorstores/hnswlib");
const { PDFLoader } = require("langchain/document_loaders/fs/pdf");
const { TextLoader } = require("langchain/document_loaders/fs/text");
const { OpenAIEmbeddings } = require("langchain/embeddings/openai");
const { CharacterTextSplitter } = require("langchain/text_splitter");
const { ConversationalRetrievalQAChain } = require("langchain/chains");
const { BufferMemory } = require("langchain/memory");

(async () => {
  const embeddings = new OpenAIEmbeddings();
  const loader = new PDFLoader("./book.pdf");
  // const loader = new TextLoader("./book.text");
  const splitter = new CharacterTextSplitter({
    chunkSize: 100,
    chunkOverlap: 50,
  });

  const model = new OpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
  });
  const baseCompressor = LLMChainExtractor.fromLLM(model);
  const docs = await loader.load();
  const splittedDocs = await splitter.splitDocuments(docs);

  const vectorStore = await HNSWLib.fromDocuments(splittedDocs, embeddings);
  const retriever = new ContextualCompressionRetriever({
    baseCompressor,
    baseRetriever: vectorStore.asRetriever(),
  });

  const memory = new BufferMemory({
    memoryKey: "chat_history", // Must be set to "chat_history"
    outputKey: "text",
    returnMessages: true,
  });

  const chain = ConversationalRetrievalQAChain.fromLLM(model, retriever, {
    returnSourceDocuments: true,
    inputKey: "query",
    qaTemplate: `
    你是一个文档问答助手, 我将给你上下文和问题, 我希望你根据上下文进行回答, 当上下文后面紧跟'问题'时, 说明条件不够充分, 你需要拒绝回答, 这意味着你所有的答案都必须依据上下文给出, 你的答案不能够超出上下文的范围, 不要试图编造答案.
    如果你没有一个有用的答案, 请委婉的告知你不知道这个问题的答案, 可以尝试其他问题.

    上下文: {context}
    
    问题：{question}
    
    有用的答案：`,

    memory,
    questionGeneratorTemplate: `给定以下对话和后续问题，请重新表述后续问题，使其成为一个独立的问题。
    !请注意人称代词的替换, 不要使人称指代的目标发生偏移.

    聊天记录：
    {chat_history}
    后续问题：{question}
    独立问题：`,
  });

  const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);

    if (parsedUrl.pathname === "/ask") {
      handleAsk(req, res);
    } else {
      res.statusCode = 404;
      res.end();
    }
  });

  const handleAsk = async (req, res) => {
    const parsedUrl = url.parse(req.url, true);

    const question = parsedUrl.query.question;
    const answer = await chain.call({
      query: question,
    });

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ answer: answer.text }));
  };

  server.listen(3002, () => {
    console.log("Server listening on port 3002");
  });
})();
