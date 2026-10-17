import { FC } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "../ui/button";

const InvalidPage: FC = () => {

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <Card>
        <CardHeader>
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <CardTitle className="mt-2 text-lg">Invalid token id</CardTitle>
          <CardDescription>
            The URL does not contain a valid token id.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/tokens">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to tokens
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}

export default InvalidPage;