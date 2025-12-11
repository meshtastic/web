import { Card, CardContent, CardHeader, CardTitle } from "@components/ui/card";
import { ScrollArea } from "@components/ui/scroll-area";
import { useDevice } from "@core/stores";
import { getSql } from "@db/index";
import { MessageSquareIcon, MapPinIcon, ActivityIcon, UsersIcon } from "lucide-react";
import { useEffect, useState } from "react";

interface Statistics {
  messageCount: number;
  directMessageCount: number;
  broadcastMessageCount: number;
  positionUpdateCount: number;
  telemetryUpdateCount: number;
  activeNodeCount: number;
  totalNodeCount: number;
  messagesLast24h: number;
  positionsLast24h: number;
}

const StatCard = ({
  icon: Icon,
  title,
  value,
  subtitle,
}: {
  icon: React.ElementType;
  title: string;
  value: string | number;
  subtitle?: string;
}) => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm md:text-base font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl md:text-4xl font-bold">{value}</p>
          {subtitle && (
            <p className="text-xs md:text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
    </CardContent>
  </Card>
);

const StatisticsPage = () => {
  const device = useDevice();
  const deviceId = device.id;
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setLoading(true);
        const sql = getSql();

        const now = Math.floor(Date.now() / 1000);
        const last24h = now - 24 * 60 * 60;

        // Total messages
        const messageCountResult = await sql(
          "SELECT COUNT(*) as count FROM messages WHERE device_id = ?",
          [deviceId]
        );
        const messageCount = messageCountResult[0]?.count || 0;

        // Direct vs broadcast
        const directMessageResult = await sql(
          "SELECT COUNT(*) as count FROM messages WHERE device_id = ? AND type = 'direct'",
          [deviceId]
        );
        const directMessageCount = directMessageResult[0]?.count || 0;

        const broadcastMessageResult = await sql(
          "SELECT COUNT(*) as count FROM messages WHERE device_id = ? AND type = 'broadcast'",
          [deviceId]
        );
        const broadcastMessageCount = broadcastMessageResult[0]?.count || 0;

        // Position updates
        const positionUpdateResult = await sql(
          "SELECT COUNT(*) as count FROM position_logs WHERE device_id = ?",
          [deviceId]
        );
        const positionUpdateCount = positionUpdateResult[0]?.count || 0;

        // Telemetry updates
        const telemetryUpdateResult = await sql(
          "SELECT COUNT(*) as count FROM telemetry_logs WHERE device_id = ?",
          [deviceId]
        );
        const telemetryUpdateCount = telemetryUpdateResult[0]?.count || 0;

        // Total nodes
        const totalNodeResult = await sql(
          "SELECT COUNT(*) as count FROM nodes WHERE device_id = ?",
          [deviceId]
        );
        const totalNodeCount = totalNodeResult[0]?.count || 0;

        // Active nodes (heard in last 24h)
        const activeNodeResult = await sql(
          "SELECT COUNT(*) as count FROM nodes WHERE device_id = ? AND last_heard > ?",
          [deviceId, last24h]
        );
        const activeNodeCount = activeNodeResult[0]?.count || 0;

        // Messages in last 24h
        const messagesLast24hResult = await sql(
          "SELECT COUNT(*) as count FROM messages WHERE device_id = ? AND date > datetime(?, 'unixepoch')",
          [deviceId, last24h]
        );
        const messagesLast24h = messagesLast24hResult[0]?.count || 0;

        // Positions in last 24h
        const positionsLast24hResult = await sql(
          "SELECT COUNT(*) as count FROM position_logs WHERE device_id = ? AND time > ?",
          [deviceId, last24h]
        );
        const positionsLast24h = positionsLast24hResult[0]?.count || 0;

        setStats({
          messageCount,
          directMessageCount,
          broadcastMessageCount,
          positionUpdateCount,
          telemetryUpdateCount,
          activeNodeCount,
          totalNodeCount,
          messagesLast24h,
          positionsLast24h,
        });
      } catch (error) {
        console.error("[Statistics] Error fetching statistics:", error);
      } finally {
        setLoading(false);
      }
    };

    if (deviceId) {
      fetchStatistics();
    }
  }, [deviceId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading statistics...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">No statistics available</div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Network Statistics</h1>
          <p className="text-muted-foreground">
            Overview of network activity and data collection
          </p>
        </div>

        {/* Overview Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={MessageSquareIcon}
            title="Total Messages"
            value={stats.messageCount.toLocaleString()}
            subtitle={`${stats.messagesLast24h} in last 24h`}
          />
          <StatCard
            icon={UsersIcon}
            title="Active Nodes"
            value={`${stats.activeNodeCount} / ${stats.totalNodeCount}`}
            subtitle="Heard in last 24h"
          />
          <StatCard
            icon={MapPinIcon}
            title="Position Updates"
            value={stats.positionUpdateCount.toLocaleString()}
            subtitle={`${stats.positionsLast24h} in last 24h`}
          />
          <StatCard
            icon={ActivityIcon}
            title="Telemetry Logs"
            value={stats.telemetryUpdateCount.toLocaleString()}
            subtitle="Total readings"
          />
        </div>

        {/* Message Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Message Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full" />
                  <span className="text-sm md:text-base">Direct Messages</span>
                </div>
                <span className="text-sm md:text-base font-medium">
                  {stats.directMessageCount.toLocaleString()} (
                  {stats.messageCount > 0
                    ? Math.round(
                        (stats.directMessageCount / stats.messageCount) * 100
                      )
                    : 0}
                  %)
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{
                    width: `${
                      stats.messageCount > 0
                        ? (stats.directMessageCount / stats.messageCount) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
                  <span className="text-sm md:text-base">Broadcast Messages</span>
                </div>
                <span className="text-sm md:text-base font-medium">
                  {stats.broadcastMessageCount.toLocaleString()} (
                  {stats.messageCount > 0
                    ? Math.round(
                        (stats.broadcastMessageCount / stats.messageCount) * 100
                      )
                    : 0}
                  %)
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{
                    width: `${
                      stats.messageCount > 0
                        ? (stats.broadcastMessageCount / stats.messageCount) *
                          100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity Summary */}
        <Card>
          <CardHeader>
            <CardTitle>24-Hour Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm md:text-base text-muted-foreground">
                  Messages per hour
                </span>
                <span className="text-sm md:text-base font-medium">
                  {(stats.messagesLast24h / 24).toFixed(1)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm md:text-base text-muted-foreground">
                  Position updates per hour
                </span>
                <span className="text-sm md:text-base font-medium">
                  {(stats.positionsLast24h / 24).toFixed(1)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm md:text-base text-muted-foreground">
                  Node activity rate
                </span>
                <span className="text-sm md:text-base font-medium">
                  {stats.totalNodeCount > 0
                    ? Math.round(
                        (stats.activeNodeCount / stats.totalNodeCount) * 100
                      )
                    : 0}
                  %
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
};

export default StatisticsPage;
