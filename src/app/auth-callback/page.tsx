"use client";

import { useRouter } from 'next/navigation';
import { trpc } from '../_trpc/client';
import React, { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Suspense } from 'react'

function Page() {
  const router = useRouter();
  const { data, isLoading, error } = trpc.authCallback.useQuery(undefined);

  useEffect(() => {
    // error code unathorized : 
    if (error?.data?.code === "UNAUTHORIZED" ) {
      router.push("/sign-in");
    }

    // success
    else if (!isLoading) {
      router.push((data !== undefined && data.success && origin) ? `/${origin}` : "/dashboard");
    }
  }, [data, isLoading, error, router]);

  return (
    <div className='w-full mt-24 flex justify-center'>
      <div className='flex flex-col items-center gap-2'>
        <Suspense fallback={<Loader2 className='h-8 w-8 animate-spin text-zinc-800'/>}>
          <h3 className='font-semibold text-xl'>
            Setting up your account...
          </h3>
          <p>You will be redirected automatically.</p>
        </Suspense>
      </div>
    </div>
  );
}

export default Page;
