import { createClient } from '@/lib/supabase/server';

export async function getCustomerId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.email) {
    const { data: customerData } = await supabase
      .from('customers')
      .select('customer_id, email')
      .eq('email', user.email)
      .single();

    if (customerData?.customer_id) {
      return customerData.customer_id as string;
    }
  }

  return '';
}
