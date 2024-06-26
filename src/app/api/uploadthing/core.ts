import { db } from '@/db'
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server'
import {
  createUploadthing,
  type FileRouter,
} from 'uploadthing/next'

import { PDFLoader } from 'langchain/document_loaders/fs/pdf'
import { pinecone } from '@/lib/pinecone';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { PineconeStore } from '@langchain/pinecone';

const f = createUploadthing()

const middleware = async () => {
  const { getUser } = getKindeServerSession()
  const user = await getUser()

  if (!user || !user.id) throw new Error('Unauthorized')

  return { userId: user.id }
}

const onUploadComplete = async ({
  metadata,
  file,
}: {
  metadata: Awaited<ReturnType<typeof middleware>>
  file: {
    key: string
    name: string
    url: string
  }
}) => {
  const isFileExist = await db.file.findFirst({
    where: {
      key: file.key,
    },
  })

  if (isFileExist) return

  const createdFile = await db.file.create({
    data: {
      key: file.key,
      name: file.name,
      userId: metadata.userId,
      url: `https://utfs.io/f/${file.key}`,
      uploadStatus: 'PROCESSING',
    },
  })

  try {
    const response = await fetch(
      `https://utfs.io/f/${file.key}`
    )

    const blob = await response.blob()

    const loader = new PDFLoader(blob)

    const pageLevelDocs = await loader.load()

   //vectorize aand index the document
   const pineconeIndex = pinecone.Index("slala"); // Use a single index name

   const embeddings = new OpenAIEmbeddings({
     openAIApiKey: process.env.OPENAI_API_KEY,
   });

   await PineconeStore.fromDocuments(pageLevelDocs, embeddings, {
     // @ts-ignore
     pineconeIndex,
   });

   await db.file.update({
     data: { uploadStatus: "SUCCESS" },
     where: { id: createdFile.id },
   });
  
   
 } catch (err) {
   await db.file.update({
     data: { uploadStatus: "FAILED" },
     where: { id: createdFile.id },
   });
 }
};
export const ourFileRouter = {
 freePlanUploader: f({ pdf: { maxFileSize: "16MB" } })
   .middleware(middleware)
   .onUploadComplete(onUploadComplete),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;