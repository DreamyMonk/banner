'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getBannerDownloads, DownloadRecord } from './actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function AnalyticsPage() {
  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
  const [filteredDownloads, setFilteredDownloads] = useState<DownloadRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [timeFilter, setTimeFilter] = useState('all');

  useEffect(() => {
    async function fetchData() {
      const downloadData = await getBannerDownloads();
      setDownloads(downloadData);
    }
    fetchData();
  }, []);

  useEffect(() => {
    let filtered = downloads;

    if (searchTerm) {
      filtered = filtered.filter((download) =>
        download.phone.includes(searchTerm)
      );
    }

    if (timeFilter !== 'all') {
      const now = new Date();
      const aDay = 24 * 60 * 60 * 1000;
      let startDate: Date;

      switch (timeFilter) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'yesterday':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
          break;
        case '7days':
          startDate = new Date(now.getTime() - 7 * aDay);
          break;
        case '30days':
          startDate = new Date(now.getTime() - 30 * aDay);
          break;
        default:
          startDate = new Date(0);
      }

      if (timeFilter === 'yesterday') {
        const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        filtered = filtered.filter((download) => {
          const downloadDate = new Date(download.downloadedAt);
          return downloadDate >= startDate && downloadDate < endDate;
        });
      } else {
        filtered = filtered.filter((download) => new Date(download.downloadedAt) >= startDate);
      }
    }

    setFilteredDownloads(filtered);
  }, [searchTerm, timeFilter, downloads]);

  const downloadCounts = filteredDownloads.reduce((acc, download) => {
    acc[download.phone] = (acc[download.phone] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Banner Download Analytics</CardTitle>
            <Button asChild>
              <Link href="/">Back to Editor</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4 mb-4">
            <Input
              placeholder="Search by phone number"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select onValueChange={setTimeFilter} defaultValue="all">
              <SelectTrigger>
                <SelectValue placeholder="Filter by time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Phone Number</TableHead>
                <TableHead>Shop Name</TableHead>
                <TableHead>Download Count</TableHead>
                <TableHead>Last Downloaded</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(downloadCounts).map(([phone, count]) => {
                const lastDownload = filteredDownloads
                  .filter((d) => d.phone === phone)
                  .sort((a, b) => new Date(b.downloadedAt).getTime() - new Date(a.downloadedAt).getTime())[0];
                return (
                  <TableRow key={phone}>
                    <TableCell>{phone}</TableCell>
                    <TableCell>{lastDownload.shopName}</TableCell>
                    <TableCell>{count}</TableCell>
                    <TableCell>{new Date(lastDownload.downloadedAt).toLocaleString('en-US', { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true })}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
