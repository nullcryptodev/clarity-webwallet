import Link from "next/link";
import { FC, ReactNode } from "react";
import { Button } from "./ui/button";
import { ArrowLeft } from "lucide-react";
import { GlassButton } from "./GlassButton";

type props = {
  go_back_url: string;
  title: string;
  subtitle: string;
  action?: ReactNode;
}

const PageHeading: FC <props> = ({
  go_back_url, title, subtitle, action
}) => (
  <div className="mb-4 flex items-center justify-between">
    <div>
      {go_back_url.length > 0 ?
        <div className="flex items-center gap-4">
          <Link href={go_back_url}>
            <GlassButton variant={'solid'} size="sm" className="hover:opacity-100 opacity-75">
              <ArrowLeft className="size-4"/>
            </GlassButton>
          </Link>
          <h1 className="text-3xl font-semibold">{title}</h1>
        </div>
        :
        <h1 className="text-3xl font-semibold">{title}</h1>
      }
      <p className="mt-2 text-muted-foreground">{subtitle}</p>
    </div>

    {action && action}
  </div>
);

export default PageHeading;