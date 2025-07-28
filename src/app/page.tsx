"use client";

import { useState, useEffect, useCallback } from "react";
import mermaid from "mermaid";
import { detectMermaidErrors } from "@/ai/flows/mermaid-error-detection";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Download,
  BotMessageSquare,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const exampleCode = `graph TD
    A[Start] --> B{Is it working?};
    B -- Yes --> C[Awesome!];
    C --> D[End];
    B -- No --> E[Fix it!];
    E --> B;
`;

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export default function MermaidVisualizerPage() {
  const [code, setCode] = useState(exampleCode);
  const [svg, setSvg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isAiChecking, setIsAiChecking] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const { toast } = useToast();

  const debouncedCode = useDebounce(code, 750);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: "neutral",
      securityLevel: "loose",
    });
  }, []);

  const renderAndCheck = useCallback(async (codeToRender: string) => {
    if (!codeToRender.trim()) {
      setSvg("");
      setError(null);
      return;
    }

    setIsRendering(true);
    setIsAiChecking(true);
    let mermaidError: string | null = null;

    try {
      await mermaid.parse(codeToRender);
      const { svg: renderedSvg } = await mermaid.render(
        `mermaid-preview-${Date.now()}`,
        codeToRender
      );
      setSvg(renderedSvg);
    } catch (e: any) {
      mermaidError = e.message || "Invalid Mermaid syntax from renderer.";
      setSvg("");
    } finally {
      setIsRendering(false);
    }

    try {
      const result = await detectMermaidErrors({ code: codeToRender });
      if (!result.isValid) {
        setError(result.errorMessage);
      } else {
        setError(mermaidError);
      }
    } catch (aiError) {
      console.error("AI error check failed:", aiError);
      setError(mermaidError);
    } finally {
      setIsAiChecking(false);
    }
  }, []);

  useEffect(() => {
    renderAndCheck(debouncedCode);
  }, [debouncedCode, renderAndCheck]);

  const handleDownload = () => {
    if (!svg) {
      toast({
        variant: "destructive",
        title: "Cannot Download",
        description: "There is no valid diagram to download.",
      });
      return;
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      toast({
        variant: "destructive",
        title: "Download Failed",
        description:
          "Could not create a canvas element to render the image.",
      });
      return;
    }

    const img = new Image();
    const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      const { width, height } = img;
      canvas.width = width + 40;
      canvas.height = height + 40;

      ctx.fillStyle = "#FAFAFA";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.drawImage(img, 20, 20);

      const pngUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = pngUrl;
      a.download = "mermaid-diagram.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    img.onerror = () => {
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: "Could not load the SVG into an image.",
      });
      URL.revokeObjectURL(url);
    };

    img.src = url;
  };

  const isLoading = isRendering || isAiChecking;

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
      <header className="sticky top-0 z-10 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl font-headline">
            Mermaid Visualizer
          </h1>
          <Button onClick={handleDownload} disabled={!svg || !!error}>
            <Download className="mr-2 h-4 w-4" />
            Download PNG
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <div className="container mx-auto p-4 md:p-8">
          <div className="grid gap-8 md:grid-cols-2">
            <div className="flex flex-col gap-4">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="font-headline">Mermaid Code</CardTitle>
                  <CardDescription>
                    Enter your Mermaid syntax below. The diagram will update in
                    real-time.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="min-h-[400px] font-mono text-sm resize-y"
                    placeholder="graph TD; A-->B;"
                  />
                </CardContent>
              </Card>

              {isLoading || error ? (
                <Alert variant={error ? "destructive" : "default"}>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <AlertTitle className="font-headline">
                    {isLoading ? "Processing..." : "Error Detected"}
                  </AlertTitle>
                  <AlertDescription>
                    {error ||
                      "Checking your code and rendering the diagram..."}
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert>
                  <BotMessageSquare className="h-4 w-4" />
                  <AlertTitle className="font-headline">AI Assistant</AlertTitle>
                  <AlertDescription>
                    Your Mermaid code looks good! The preview is on the right.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="flex flex-col">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="font-headline">Preview</CardTitle>
                  <CardDescription>
                    This is a live preview of your diagram.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative min-h-[400px] w-full rounded-md border bg-white p-4 transition-all duration-300 flex items-center justify-center overflow-auto">
                    {isRendering && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    )}
                    <div
                      key={debouncedCode}
                      className="w-full h-full flex items-center justify-center animate-in fade-in duration-500"
                      dangerouslySetInnerHTML={{ __html: svg }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <footer className="py-6 md:px-8 md:py-0 border-t">
        <div className="container flex flex-col items-center justify-center gap-4 md:h-24 md:flex-row">
          <p className="text-center text-sm leading-loose text-muted-foreground">
            Built with Next.js, ShadCN/UI, and Genkit.
          </p>
        </div>
      </footer>
    </div>
  );
}
