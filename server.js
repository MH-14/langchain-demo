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
const { OpenAIEmbeddings } = require("langchain/embeddings/openai");
const { CharacterTextSplitter } = require("langchain/text_splitter");
const { SystemChatMessage } = require("langchain/schema");
(async () => {
  const embeddings = new OpenAIEmbeddings();
  const loader = new PDFLoader("./book.pdf");
  const splitter = new CharacterTextSplitter({
    chunkSize: 2000,
    chunkOverlap: 200,
  });

  const model = new OpenAI({
    openAIApiKey: "sk-",
  });
  const baseCompressor = LLMChainExtractor.fromLLM(model);
  const docs = await loader.load();
  const splittedDocs = await splitter.splitDocuments(docs);

  const vectorStore = await HNSWLib.fromDocuments(splittedDocs, embeddings);
  const retriever = new ContextualCompressionRetriever({
    baseCompressor,
    baseRetriever: vectorStore.asRetriever(),
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
    const { RetrievalQAChain, loadQAStuffChain } = require("langchain/chains");

    const { BufferMemory } = require("langchain/memory");

    const parsedUrl = url.parse(req.url, true);

    const chain = new RetrievalQAChain({
      combineDocumentsChain: loadQAStuffChain(model),
      retriever,
      memory: new BufferMemory({ returnMessages: true, memoryKey: "history" }),
    });

    const question = parsedUrl.query.question;

    const answer = await chain.call([
      new SystemChatMessage(
        "你是一个文档回答助手, 你将按照文档内容进行回答, 对文档以外的内容请进行回避"
      ),
      { query: question },
    ]);
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
