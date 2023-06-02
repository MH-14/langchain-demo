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
const {
  SystemChatMessage,
  AIChatMessage,
  HumanChatMessage,
} = require("langchain/schema");
const { ConversationalRetrievalQAChain } = require("langchain/chains");
const { BufferMemory, ChatMessageHistory } = require("langchain/memory");
const {
  RetrievalQAChain,
  loadQAStuffChain,
  loadQAMapReduceChain,
  loadQARefineChain,
} = require("langchain/chains");

(async () => {
  const embeddings = new OpenAIEmbeddings();
  // const loader = new PDFLoader("./book.pdf");
  const loader = new TextLoader("./book.text");
  const splitter = new CharacterTextSplitter({
    chunkSize: 2000,
    chunkOverlap: 200,
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
  const systemMessage = new SystemChatMessage(
    "你是一个文档回答助手, 接下来你将用中文回答用户的问题, 你将按照文档内容进行回答, 对文档以外的内容请进行回避."
  );
  const humanMessage = new HumanChatMessage("你叫什么名字");
  const aiMessage2 = new AIChatMessage(
    "对不起, 这个问题不在文档中, 我不能进行回答."
  );
  const memory = new BufferMemory({
    memoryKey: "chat_history", // Must be set to "chat_history"
    chatHistory: new ChatMessageHistory([
      systemMessage,
      humanMessage,
      aiMessage2,
    ]),
    outputKey: "text",
    returnMessages: true,
  });

  // const chain = new RetrievalQAChain({
  //   combineDocumentsChain: loadQAStuffChain(model),
  //   retriever,
  //   memory: new BufferMemory({
  //     returnMessages: true,
  //     memoryKey: "history",
  //     chatHistory: new ChatMessageHistory([systemMessage, aiMessage]),
  //   }),
  // });

  const chain = ConversationalRetrievalQAChain.fromLLM(model, retriever, {
    returnSourceDocuments: true,
    memory,
  });

  // const chain = loadQARefineChain(model, {
  //   memory: new BufferMemory({
  //     memoryKey: "chat_history", // Must be set to "chat_history"
  //     chatHistory: new ChatMessageHistory([systemMessage, aiMessage]),
  //   }),
  // });

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
      question,
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
