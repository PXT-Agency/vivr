import { Star, Sparkles, PhoneCall } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const featuredNumbers = ["*0001", "*0002", "*0003", "*0004", "*0005"];

export default function PublicHomePage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-16 px-4 py-16 sm:px-6">
      <section className="flex flex-col items-center gap-6 text-center">
        <Badge variant="secondary" className="gap-1.5">
          <Sparkles aria-hidden="true" className="size-3.5" />
          Kenyan star-number inventory platform
        </Badge>
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Reserved star numbers for your brand, built on VIVR.
        </h1>
        <p className="text-muted-foreground max-w-xl text-lg leading-8">
          Premium four-digit star numbers such as{" "}
          <span className="text-foreground font-mono font-medium">*0001</span> through{" "}
          <span className="text-foreground font-mono font-medium">*2000</span>, catalogued with
          strict validation and tenant-safe management.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <a href="/inventory">Browse inventory</a>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href="/dashboard">Open dashboard</a>
          </Button>
        </div>
      </section>

      <section
        aria-labelledby="featured-title"
        className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        {featuredNumbers.map((number) => (
          <Card key={number}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-mono text-xl">
                <Star aria-hidden="true" className="text-primary size-4" />
                {number}
              </CardTitle>
              <CardDescription>Featured sample number</CardDescription>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              <span className="inline-flex items-center gap-1.5">
                <PhoneCall aria-hidden="true" className="size-3.5" />
                Exact code search preserves leading zeroes.
              </span>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
