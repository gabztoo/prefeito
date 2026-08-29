import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import ManageSubscription from "./_components/manage-subscription";

export default function PaymentPage() {
  return (
    <div>
      <div className="p-6 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Payment Management</CardTitle>
            <CardDescription>
              Payment management is not available in this build.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ManageSubscription />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
