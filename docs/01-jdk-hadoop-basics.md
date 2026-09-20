# JDK 与 Hadoop：从零配置到单机验证

适用环境：openEuler 24.03，Hadoop 3.3.6，单机伪分布式学习环境。

## 1. 先建立全图

```text
JDK
  └─ 提供 java 命令和 Java 运行环境
       └─ Hadoop 的 NameNode、DataNode、YARN 等进程都由 Java 启动

Hadoop
  ├─ HDFS：存放文件
  ├─ MapReduce：处理数据
  └─ YARN：给计算任务分配 CPU 和内存
```

Hadoop 本身是一组 Java 程序。因此，先让 `java -version` 正常，再配置 Hadoop。

## 2. JDK 的基础概念

| 名称 | 含义 | 在 Hadoop 中的作用 |
| --- | --- | --- |
| JDK | Java Development Kit，包含运行 Java 所需的工具 | Hadoop 启动守护进程和命令行工具所需 |
| `java` | Java 虚拟机启动命令 | 实际运行 NameNode、DataNode、YARN 等 Java 进程 |
| `javac` | Java 编译器 | 学习或开发 Java MapReduce 程序时使用 |
| `JAVA_HOME` | JDK 安装根目录 | Hadoop 用它找到正确的 `java` |
| `PATH` | Shell 查找命令的目录列表 | 使终端可以直接执行 `java`、`hadoop` |

可以把 `JAVA_HOME` 理解为“JDK 的住址”，把 `PATH` 理解为“命令搜索路线”。

## 3. 安装并确认 JDK

Hadoop 3.3.6 学习环境建议先用 Java 8，兼容性最稳。

```bash
dnf install -y java-1.8.0-openjdk-devel wget tar
java -version
javac -version
```

确认 JDK 的真实安装目录，**不要猜路径**：

```bash
readlink -f "$(dirname "$(dirname "$(readlink -f "$(command -v java)")")")"
```

假设输出为 `/usr/lib/jvm/java-1.8.0-openjdk`，写入当前用户环境：

```bash
cat >> ~/.bashrc <<'EOF'
# >>> JDK >>>
export JAVA_HOME=/usr/lib/jvm/java-1.8.0-openjdk
export PATH=$JAVA_HOME/bin:$PATH
# <<< JDK <<<
EOF

source ~/.bashrc
echo "$JAVA_HOME"
java -version
```

如果上面的目录与实际输出不同，只替换 `JAVA_HOME=` 后面的目录。

## 4. 下载 Hadoop

国内网络访问 Apache 归档站较慢时，优先使用国内镜像并支持断点续传：

```bash
cd /opt
wget -c --show-progress \
  https://mirrors.huaweicloud.com/apache/hadoop/common/hadoop-3.3.6/hadoop-3.3.6.tar.gz
tar -tzf hadoop-3.3.6.tar.gz >/dev/null && echo "压缩包正常"
tar -xzf hadoop-3.3.6.tar.gz
ln -s hadoop-3.3.6 hadoop
```

加入 Hadoop 环境变量：

```bash
cat >> ~/.bashrc <<'EOF'
# >>> Hadoop >>>
export HADOOP_HOME=/opt/hadoop
export HADOOP_CONF_DIR=$HADOOP_HOME/etc/hadoop
export PATH=$PATH:$HADOOP_HOME/bin:$HADOOP_HOME/sbin
# <<< Hadoop <<<
EOF

source ~/.bashrc
hadoop version
```

## 5. Hadoop 的核心配置文件

目录：`$HADOOP_HOME/etc/hadoop/`

| 文件 | 解决的问题 | 单机示例 |
| --- | --- | --- |
| `hadoop-env.sh` | Hadoop 到哪里找 Java | `export JAVA_HOME=...` |
| `core-site.xml` | 默认使用哪个文件系统 | `hdfs://localhost:9000` |
| `hdfs-site.xml` | HDFS 数据与元数据放哪里、保留几份副本 | 副本数为 `1` |
| `mapred-site.xml` | MapReduce 任务交给谁执行 | `yarn` |
| `yarn-site.xml` | YARN 的资源管理和任务执行服务 | 启用 shuffle 服务 |
| `workers` | 哪些机器启动 DataNode/NodeManager | 单机填 `localhost` |

### 5.1 配置 Hadoop 使用 JDK

编辑 `$HADOOP_HOME/etc/hadoop/hadoop-env.sh`，加入或修改：

```bash
export JAVA_HOME=/usr/lib/jvm/java-1.8.0-openjdk
```

这里必须与前面确认过的 JDK 真实目录一致。

### 5.2 `core-site.xml`：Hadoop 的默认入口

```xml
<configuration>
  <property>
    <name>fs.defaultFS</name>
    <value>hdfs://localhost:9000</value>
  </property>
</configuration>
```

含义：后续执行 `hdfs dfs -ls /` 时，默认操作的是 `localhost:9000` 上的 HDFS，而不是本机 Linux 文件系统。

### 5.3 `hdfs-site.xml`：HDFS 如何存数据

```xml
<configuration>
  <property>
    <name>dfs.replication</name>
    <value>1</value>
  </property>
  <property>
    <name>dfs.namenode.name.dir</name>
    <value>file:///data/hadoop/nn</value>
  </property>
  <property>
    <name>dfs.datanode.data.dir</name>
    <value>file:///data/hadoop/dn</value>
  </property>
</configuration>
```

- NameNode 目录：保存“文件名在哪些数据块上”的元数据。
- DataNode 目录：保存真正的数据块。
- 单机只有一台机器，所以副本数设为 `1`；生产集群常设为 `3`。

先创建目录：

```bash
mkdir -p /data/hadoop/nn /data/hadoop/dn
```

### 5.4 `mapred-site.xml`：MapReduce 如何运行

原文件通常是 `mapred-site.xml.template`，先复制：

```bash
cd "$HADOOP_CONF_DIR"
cp mapred-site.xml.template mapred-site.xml
```

内容：

```xml
<configuration>
  <property>
    <name>mapreduce.framework.name</name>
    <value>yarn</value>
  </property>
</configuration>
```

含义：MapReduce 任务不自己找资源，而是交给 YARN 调度。

### 5.5 `yarn-site.xml`：YARN 如何调度资源

```xml
<configuration>
  <property>
    <name>yarn.resourcemanager.hostname</name>
    <value>localhost</value>
  </property>
  <property>
    <name>yarn.nodemanager.aux-services</name>
    <value>mapreduce_shuffle</value>
  </property>
</configuration>
```

`mapreduce_shuffle` 是 MapReduce 在不同任务阶段之间交换中间结果所需的服务。

### 5.6 `workers`：哪些节点参与服务

单机内容只有一行：

```text
localhost
```

多机集群则写每台工作节点的主机名或 IP，一行一个。

## 6. 第一次启动与验证

首次启动前格式化 NameNode。这个操作会初始化 HDFS 元数据，已经有数据的环境不能重复格式化。

```bash
hdfs namenode -format
start-dfs.sh
start-yarn.sh
jps
```

单机正常时，`jps` 至少应看到：

```text
NameNode
DataNode
SecondaryNameNode
ResourceManager
NodeManager
```

最后创建 HDFS 目录并上传一个文件：

```bash
hdfs dfs -mkdir -p /user/root/input
echo "hello hadoop" > /tmp/hello.txt
hdfs dfs -put /tmp/hello.txt /user/root/input/
hdfs dfs -cat /user/root/input/hello.txt
```

看到 `hello hadoop`，说明 JDK、HDFS 和基本命令链路已经通了。

## 7. 遇到问题先查什么

```bash
echo "$JAVA_HOME"             # JDK 路径是否正确
java -version                  # Java 是否可执行
hadoop version                 # Hadoop 是否找到 Java
jps                            # Hadoop 守护进程是否启动
hdfs dfsadmin -report          # DataNode 是否正常注册
```

常见报错与第一判断：

| 现象 | 优先检查 |
| --- | --- |
| `JAVA_HOME is not set` | `hadoop-env.sh` 的 `JAVA_HOME` 是否为真实路径 |
| `Connection refused` | `NameNode` 或 `ResourceManager` 是否已启动；用 `jps` 看进程 |
| 副本不足 | 单机环境的 `dfs.replication` 是否仍为 `3` |
| `Permission denied` | `/data/hadoop` 目录的属主是否与启动 Hadoop 的用户一致 |

## 8. 下一步学习主线

先完成单机 HDFS 文件上传下载，再理解：

```text
HDFS（存数据） -> YARN（分资源） -> MapReduce（处理数据）
```

Hive、Tez、Spark 都会建立在这条主线上。
