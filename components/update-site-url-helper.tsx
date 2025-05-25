"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"

export function UpdateSiteUrlHelper() {
  const [isLoading, setIsLoading] = useState(false)

  const handleUpdateSiteUrl = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/update-site-url")
      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      toast({
        title: "Site URL updated",
        description: `Site URL set to: ${data.siteUrl}`,
      })
    } catch (error: any) {
      toast({
        title: "Error updating site URL",
        description: error.message || "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Update Site URL Configuration</CardTitle>
        <CardDescription>Update the site URL in Supabase to fix email confirmation links</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          The email confirmation links are still using localhost:3000 instead of your deployed site URL. This helper
          will attempt to update the configuration, but you may need to update it manually in the Supabase dashboard.
        </p>
        <div className="bg-amber-50 border border-amber-200 rounded-md p-4 text-amber-800 text-sm">
          <p className="font-medium">Manual Supabase Configuration:</p>
          <ol className="list-decimal ml-4 mt-2 space-y-1">
            <li>
              Go to the{" "}
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Supabase Dashboard
              </a>
            </li>
            <li>Select your project</li>
            <li>Go to Authentication → URL Configuration</li>
            <li>
              Update the Site URL to:{" "}
              <code className="bg-gray-100 px-1 py-0.5 rounded">
                {process.env.NEXT_PUBLIC_SITE_URL || "https://v0-image-analysis-chi-five-88.vercel.app"}
              </code>
            </li>
            <li>
              Update the Redirect URLs to include:{" "}
              <code className="bg-gray-100 px-1 py-0.5 rounded">
                {process.env.NEXT_PUBLIC_SITE_URL || "https://v0-image-analysis-chi-five-88.vercel.app"}/auth/callback
              </code>
            </li>
            <li>Save the changes</li>
          </ol>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleUpdateSiteUrl} disabled={isLoading}>
          {isLoading ? "Updating..." : "Update Site URL"}
        </Button>
      </CardFooter>
    </Card>
  )
}
