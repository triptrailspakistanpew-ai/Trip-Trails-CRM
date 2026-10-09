import { Button } from "@/components/ui/button";

interface TableEntityLinkProps {
  onClick: () => void;
  children: React.ReactNode;
}

export function TableEntityLink({ onClick, children }: TableEntityLinkProps) {
  return (
    <Button
      variant="link"
      size="sm"
      onClick={onClick}
      className="h-auto p-0 font-mono text-xs font-medium text-tf-primary"
    >
      {children}
    </Button>
  );
}
