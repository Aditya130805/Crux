"""
Graph router - handles graph data operations with Neo4j
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Any, Dict
import uuid
from neo4j.time import DateTime

from database import get_db, get_neo4j_session
from models import User
from schemas import (
    NodeCreate, NodeResponse, EdgeCreate, EdgeResponse,
    GraphData, ProjectCreate, SkillCreate, ExperienceCreate,
    EducationCreate, ProfileResponse
)
from auth_utils import get_current_user

router = APIRouter()


def serialize_neo4j_value(value: Any) -> Any:
    """Convert Neo4j types to JSON-serializable Python types"""
    if isinstance(value, DateTime):
        return value.iso_format()
    elif isinstance(value, dict):
        return {k: serialize_neo4j_value(v) for k, v in value.items()}
    elif isinstance(value, (list, tuple)):
        return [serialize_neo4j_value(item) for item in value]
    return value


def serialize_neo4j_dict(data: Dict[str, Any]) -> Dict[str, Any]:
    """Serialize a dictionary containing Neo4j types"""
    return {k: serialize_neo4j_value(v) for k, v in data.items()}


async def create_user_node_if_not_exists(neo4j_session, user: User):
    """Create user node in Neo4j if it doesn't exist"""
    query = """
    MERGE (u:User {id: $user_id})
    ON CREATE SET 
        u.username = $username,
        u.email = $email,
        u.created_at = datetime()
    RETURN u
    """
    await neo4j_session.run(
        query,
        user_id=str(user.id),
        username=user.username,
        email=user.email
    )


@router.get("/users/{username}/graph", response_model=GraphData)
async def get_user_graph(
    username: str,
    db: Session = Depends(get_db),
    neo4j_session = Depends(get_neo4j_session)
):
    """
    Get complete graph data for a user (public endpoint)
    """
    # Get user from PostgreSQL
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user.profile_visibility == "private":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This profile is private"
        )
    
    # Query Neo4j for graph data
    query = """
    MATCH (u:User {id: $user_id})
    OPTIONAL MATCH (u)-[r1]->(n)
    OPTIONAL MATCH (n)-[r2]->(m)
    WHERE NOT m:User
    RETURN u, collect(DISTINCT n) as connected_nodes, 
           collect(DISTINCT m) as target_nodes,
           collect(DISTINCT r1) as user_edges,
           collect(DISTINCT r2) as node_edges
    """
    
    result = await neo4j_session.run(query, user_id=str(user.id))
    record = await result.single()
    
    if not record:
        # Return empty graph if user has no data
        return GraphData(nodes=[], edges=[])
    
    # Transform Neo4j data to response format
    nodes = []
    edges = []
    
    # Add user node
    user_node = record["u"]
    if user_node:
        nodes.append({
            "data": {
                "id": user_node["id"],
                "label": user_node.get("username", "User"),
                "type": "User"
            }
        })
    
    # Add directly connected nodes
    for node in record["connected_nodes"]:
        if node:
            node_labels = list(node.labels)
            node_type = node_labels[0] if node_labels else "Unknown"
            node_dict = serialize_neo4j_dict(dict(node))
            nodes.append({
                "data": {
                    "id": node_dict["id"],
                    "label": node_dict.get("name", node_dict.get("institution", "Node")),
                    "type": node_type,
                    **{k: v for k, v in node_dict.items() if k not in ["id"]}
                }
            })
    
    # Add target nodes from node-to-node relationships
    for node in record["target_nodes"]:
        if node and node["id"] not in [n["data"]["id"] for n in nodes]:
            node_labels = list(node.labels)
            node_type = node_labels[0] if node_labels else "Unknown"
            node_dict = serialize_neo4j_dict(dict(node))
            nodes.append({
                "data": {
                    "id": node_dict["id"],
                    "label": node_dict.get("name", node_dict.get("institution", "Node")),
                    "type": node_type,
                    **{k: v for k, v in node_dict.items() if k not in ["id"]}
                }
            })
    
    # Add edges (existing code remains the same)
    for edge in record["user_edges"]:
        if edge:
            edge_dict = serialize_neo4j_dict(dict(edge))
            edges.append({
                "data": {
                    "source": edge.start_node["id"],
                    "target": edge.end_node["id"],
                    "relationship": edge.type,
                    **edge_dict
                }
            })
    
    for edge in record["node_edges"]:
        if edge:
            edge_dict = serialize_neo4j_dict(dict(edge))
            edges.append({
                "data": {
                    "source": edge.start_node["id"],
                    "target": edge.end_node["id"],
                    "relationship": edge.type,
                    **edge_dict
                }
            })
    
    return GraphData(nodes=nodes, edges=edges)


@router.post("/users/{username}/projects", response_model=NodeResponse)
async def create_project(
    username: str,
    project: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    neo4j_session = Depends(get_neo4j_session)
):
    """
    Create a new project node and link to user
    """
    if current_user.username != username:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only add projects to your own profile"
        )
    
    # Ensure user node exists
    await create_user_node_if_not_exists(neo4j_session, current_user)
    
    # Create project node
    project_id = str(uuid.uuid4())
    query = """
    MATCH (u:User {id: $user_id})
    CREATE (p:Project {
        id: $project_id,
        name: $name,
        description: $description,
        url: $url,
        source: $source,
        stars: $stars,
        created_at: datetime()
    })
    CREATE (u)-[:CREATED {date: datetime()}]->(p)
    RETURN p
    """
    
    await neo4j_session.run(
        query,
        user_id=str(current_user.id),
        project_id=project_id,
        name=project.name,
        description=project.description,
        url=project.url,
        source=project.source,
        stars=project.stars
    )
    
    # If technologies are provided, create skill nodes and relationships
    if project.technologies:
        for tech in project.technologies:
            skill_query = """
            MATCH (p:Project {id: $project_id})
            MERGE (s:Skill {name: $skill_name})
            ON CREATE SET s.id = $skill_id, s.category = 'technology'
            MERGE (p)-[:USES {confidence: 1.0}]->(s)
            MERGE (u:User {id: $user_id})-[:HAS_SKILL]->(s)
            """
            await neo4j_session.run(
                skill_query,
                project_id=project_id,
                skill_name=tech,
                skill_id=str(uuid.uuid4()),
                user_id=str(current_user.id)
            )
    
    return NodeResponse(id=project_id, type="Project", data=project.dict())


@router.post("/users/{username}/skills", response_model=NodeResponse)
async def create_skill(
    username: str,
    skill: SkillCreate,
    current_user: User = Depends(get_current_user),
    neo4j_session = Depends(get_neo4j_session)
):
    """
    Create a new skill node and link to user
    """
    if current_user.username != username:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only add skills to your own profile"
        )
    
    await create_user_node_if_not_exists(neo4j_session, current_user)
    
    skill_id = str(uuid.uuid4())
    query = """
    MATCH (u:User {id: $user_id})
    MERGE (s:Skill {name: $name})
    ON CREATE SET 
        s.id = $skill_id,
        s.category = $category,
        s.proficiency = $proficiency
    MERGE (u)-[:HAS_SKILL {proficiency: $proficiency}]->(s)
    RETURN s
    """
    
    await neo4j_session.run(
        query,
        user_id=str(current_user.id),
        skill_id=skill_id,
        name=skill.name,
        category=skill.category,
        proficiency=skill.proficiency
    )
    
    return NodeResponse(id=skill_id, type="Skill", data=skill.dict())


@router.post("/users/{username}/experience", response_model=NodeResponse)
async def create_experience(
    username: str,
    experience: ExperienceCreate,
    current_user: User = Depends(get_current_user),
    neo4j_session = Depends(get_neo4j_session)
):
    """
    Create work experience (organization + relationship)
    """
    if current_user.username != username:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only add experience to your own profile"
        )
    
    await create_user_node_if_not_exists(neo4j_session, current_user)
    
    org_id = str(uuid.uuid4())
    query = """
    MATCH (u:User {id: $user_id})
    MERGE (o:Organization {name: $org_name})
    ON CREATE SET 
        o.id = $org_id,
        o.type = $org_type,
        o.location = $location
    CREATE (u)-[:WORKED_AT {
        title: $title,
        start_date: $start_date,
        end_date: $end_date,
        current: $current,
        description: $description
    }]->(o)
    RETURN o
    """
    
    await neo4j_session.run(
        query,
        user_id=str(current_user.id),
        org_id=org_id,
        org_name=experience.organization_name,
        org_type=experience.organization_type,
        location=experience.location,
        title=experience.title,
        start_date=experience.start_date,
        end_date=experience.end_date,
        current=experience.current,
        description=experience.description
    )
    
    return NodeResponse(id=org_id, type="Organization", data=experience.dict())


@router.delete("/users/{username}/nodes/{node_id}")
async def delete_node(
    username: str,
    node_id: str,
    current_user: User = Depends(get_current_user),
    neo4j_session = Depends(get_neo4j_session)
):
    """
    Delete a node from user's graph
    """
    if current_user.username != username:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete from your own profile"
        )
    
    # Delete node and all its relationships
    query = """
    MATCH (n {id: $node_id})
    WHERE NOT n:User
    DETACH DELETE n
    RETURN count(n) as deleted
    """
    
    result = await neo4j_session.run(query, node_id=node_id)
    record = await result.single()
    
    if record["deleted"] == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Node not found or cannot be deleted"
        )
    
    return {"success": True, "message": "Node deleted successfully"}
