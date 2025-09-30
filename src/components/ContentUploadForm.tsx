import { useMutation, useQuery } from '@tanstack/react-query'
import { useConvexMutation, convexQuery } from '@convex-dev/react-query'
import { api } from '@convex/_generated/api'
import { Id } from '@convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Upload, FileText, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface ContentUploadFormProps {
  eventId: Id<'events'>
  currentStatus: 'none' | 'processing' | 'ready' | 'error'
}

export function ContentUploadForm({
  eventId,
  currentStatus,
}: ContentUploadFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const { data: contentChunks, isLoading: chunksLoading } = useQuery(
    convexQuery(api.content.listByEvent, { eventId }),
  )

  const processFile = useConvexMutation(api.content.processFileUpload)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      const validTypes = [
        'application/pdf',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
      ]
      if (!validTypes.includes(file.type)) {
        toast.error('Invalid file type. Please upload PDF, PPT, or TXT files.')
        return
      }
      setSelectedFile(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const content = e.target?.result as string

        await processFile.mutateAsync({
          eventId,
          fileName: selectedFile.name,
          fileType: selectedFile.type,
          fileContent: content,
        })

        toast.success('File uploaded and processing started')
        setSelectedFile(null)
      }

      // Read as text for simplicity (in production, handle binary files properly)
      reader.readAsText(selectedFile)
    } catch (error) {
      toast.error('Failed to upload file')
      console.error(error)
    }
  }

  const getStatusIcon = () => {
    switch (currentStatus) {
      case 'ready':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'processing':
        return <Loader2 className="h-5 w-5 text-yellow-500 animate-spin" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <FileText className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusText = () => {
    switch (currentStatus) {
      case 'ready':
        return 'Content indexed and ready'
      case 'processing':
        return 'Processing content...'
      case 'error':
        return 'Error processing content'
      default:
        return 'No content uploaded'
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Upload Event Content</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <span className="text-sm font-medium">{getStatusText()}</span>
          </div>

          <div className="space-y-3">
            <div>
              <Input
                type="file"
                accept=".pdf,.ppt,.pptx,.txt"
                onChange={handleFileSelect}
                disabled={currentStatus === 'processing'}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Upload PDF, PowerPoint, or text files containing your event
                information
              </p>
            </div>

            {selectedFile && (
              <div className="flex items-center justify-between p-3 bg-muted rounded">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm">{selectedFile.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <Button
                  onClick={handleUpload}
                  disabled={processFile.isPending}
                >
                  {processFile.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {contentChunks && contentChunks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Indexed Content</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {contentChunks.length} content chunks indexed from{' '}
                {new Set(contentChunks.map((c) => c.sourceFileName)).size} file(s)
              </p>
              <div className="space-y-2">
                {Array.from(
                  new Set(contentChunks.map((c) => c.sourceFileName)),
                ).map((fileName) => {
                  const fileChunks = contentChunks.filter(
                    (c) => c.sourceFileName === fileName,
                  )
                  return (
                    <div
                      key={fileName}
                      className="flex items-center justify-between p-2 bg-muted rounded text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span>{fileName}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {fileChunks.length} chunks
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
